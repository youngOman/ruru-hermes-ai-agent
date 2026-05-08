# 用 SSH Tunnel 在筆電開發、API 卻打到家裡 mac mini 上的服務

> 這是寫給 AI 加工成部落格用的素材，不是最終版本。包含完整背景、原理、每個指令的解釋、以及實際踩到的坑。

---

## TL;DR

我有一個前後端分離的個人專案：

- **前端**：React + Vite，跑在筆電（macOS）上開發
- **後端**：自己寫的 AI agent server（Hermes），跑在家裡的 mac mini 上，負責處理對話 / Telegram bot / Discord bot 等等
- 後端聽在 mac mini 的 `127.0.0.1:8642`

我在外面咖啡廳開發前端時，需要前端能打到 mac mini 上的後端 API。最後用 **SSH tunnel + Tailscale** 解決，前端 code 不用改一行，後端也不用改一行。

這篇紀錄整個過程的脈絡、原理、實際指令。

---

## 場景與目標

### 拓撲

```
[筆電 (akebi)]                              [mac mini (mini)]
192.168.8.x                                  192.168.1.x
                                             ├── Hermes API server (:8642)
                                             ├── Mattermost bot
                                             ├── Telegram bot
                                             └── Discord bot

兩台都加入同一個 Tailscale tailnet，所以彼此有 100.x.x.x 的私有 IP
```

兩台不在同一個 LAN 網段（家裡兩個 router 串接，subnet 不同），但都在 Tailscale 上。

### 我要解決的問題

筆電上的 Vite dev server（`http://localhost:5174`）會把所有 `/v1/*` 的 fetch proxy 到一個固定 target：

```ts
// vite.config.ts
proxy: {
  '/v1': {
    target: 'http://127.0.0.1:8642',
    changeOrigin: true,
  },
}
```

問題是 mac mini 上的 Hermes 才是真的後端，筆電的 `127.0.0.1:8642` 沒東西在 listen。

### 我考慮過的方案

**方案 A：改 vite.config 直接指到 mac mini**

```ts
target: 'http://100.67.90.58:8642'  // mac mini 的 Tailscale IP
```

問題：
- 把開發環境的網路拓撲寫進 repo（不該）
- 換筆電 / 換協作者就要改一次
- 之後想離線開發（在咖啡廳沒網路），又要改回 `127.0.0.1`

**方案 B：筆電上自己跑一份 Hermes**

可行，但 Hermes 跟 Mattermost / Telegram bot 綁定 — 兩台同時跑會搶同一個 bot token，訊息會被收兩次（甚至 race condition）。要避免的話得另外維護一份「只開 chat completions API、關掉所有 bot integration」的設定，麻煩。

**方案 C：SSH tunnel**

讓筆電的 `127.0.0.1:8642` 「看起來」有服務在 listen，但實際上請求被 SSH 透明轉發到 mac mini 的 `127.0.0.1:8642`。前端、後端、vite.config 都不用動。

選 C。

---

## 原理：SSH 的 port forwarding

SSH 不只是「遠端登入」，它還能在連線上開隧道，把網路流量在兩端之間搬。有兩種方向：

### `-L` 本地轉發（Local forward）

```bash
ssh -L 8642:localhost:8642 user@remote
       ↑    ↑              ↑
       |    |              SSH server (對方)
       |    從 SSH server 看出去要連到哪
       SSH client (我的筆電) 上要 listen 哪個 port
```

**讀法**：「在我筆電上開一個 8642 port，任何打到它的封包都從 SSH 連線通到 remote，再由 remote 用 `localhost:8642` 解析後連出去」。

**白話**：我筆電的 `127.0.0.1:8642` 打過去，相當於在 mac mini 上對 `127.0.0.1:8642` 發請求。

### `-R` 反向轉發（Remote forward）

跟 `-L` 方向相反 — 在 SSH server 上開 port，封包流回 SSH client 那邊。我這次不需要，但要小心別搞錯方向。

> 我第一個想到的指令是 `ssh -R 8642:localhost:8642 user@macmini`，但其實這方向是錯的（會在 mac mini 上開 port 把流量導回筆電），跟我的需求剛好相反。**要把筆電當「發起端」、把 mac mini 當「服務端」，永遠是 `-L`**。

---

## 步驟一：先確認兩台連得到

我以為兩台在同一個 Wi-Fi 就一定通，但實際上：

```bash
# 在筆電
ipconfig getifaddr en0
# → 192.168.8.97
route -n get default | grep gateway
# → 192.168.8.1

# 然後試 ping mac mini
ping -c 2 192.168.1.173
# → 100% packet loss ❌
```

兩台 IP 在不同 subnet，根本路由不過去。原因是家裡有兩台 router 串接，沒做正確的橋接。

### 解法：Tailscale

[Tailscale](https://tailscale.com/) 是 mesh VPN，每台裝置裝完登入後，會拿到一個 `100.x.x.x` 的 Tailscale IP，**任何兩台 tailnet 內的裝置可以互相通訊，不管它們實際在哪個網路**。

兩台都裝好之後：

```bash
tailscale status
# 100.108.216.31  akebi  loyang0921@  macOS  -
# 100.67.90.58    mini   loyang0921@  macOS  active; direct ...
```

`active; direct` 代表兩台之間建立了 P2P 直連（不走 Tailscale 的 relay server），延遲很低。

之後要連 mac mini 就用 hostname `mini`，Tailscale 會幫忙解析。

---

## 步驟二：確認 SSH 能登入

```bash
nc -zv -G 5 mini 22
# → Connection to mini port 22 [tcp/ssh] succeeded! ✓

ssh -o BatchMode=yes mini "echo OK"
# → Permission denied (publickey,password,...) ✗
```

Port 22 通了（mac mini 開了 Remote Login），但 public key 還沒推上去，所以拒絕登入。

### 推 public key 上 mac mini

```bash
# 確認筆電有 ssh key
ls ~/.ssh/id_ed25519.pub

# 推上 mac mini（會 prompt mac mini 上的密碼，輸入一次就好）
ssh-copy-id young@mini
```

`ssh-copy-id` 會把 `~/.ssh/id_ed25519.pub` 的內容追加到 mac mini 上的 `~/.ssh/authorized_keys`。之後 SSH 連線時，client 會用對應的 private key 簽名，server 用 authorized_keys 裡的 public key 驗證 — 通過就免密碼。

驗證：

```bash
ssh mini "echo OK; hostname"
# → OK
# → mini ✓
```

---

## 步驟三：寫進 `~/.ssh/config`

每次打 `ssh young@mini` 很煩，而且 SSH tunnel 場景需要一些 keep-alive 設定避免假死。寫進 config：

```ssh-config
Host mini
    HostName mini
    User young
    IdentityFile ~/.ssh/id_ed25519
    AddKeysToAgent yes
    # tunnel 斷線自動偵測 + 連不上 forward port 直接 exit（避免假活）
    ServerAliveInterval 30
    ServerAliveCountMax 3
    ExitOnForwardFailure yes
```

- `ServerAliveInterval 30` — 每 30 秒送一個 keep-alive packet
- `ServerAliveCountMax 3` — 連續 3 次沒回應就判斷斷線、結束 SSH process
- `ExitOnForwardFailure yes` — 如果 tunnel 開不起來（例如 port 已被佔用）就直接 exit，不要假裝 SSH 還活著

之後直接 `ssh mini` 就好。

---

## 步驟四：開 tunnel

```bash
ssh -N -L 8642:localhost:8642 mini
```

- `-N` — 不要開遠端 shell，純粹做 tunnel
- `-L 8642:localhost:8642 mini` — 在筆電開 8642 port，把流量轉到 mac mini 上的 `localhost:8642`

驗證：

```bash
# 筆電上 8642 是否在 listen
lsof -iTCP:8642 -sTCP:LISTEN -nP
# → ssh ... TCP 127.0.0.1:8642 (LISTEN) ✓

# 試打 API
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8642/v1/models
# → 200 ✓
```

打到筆電的 `127.0.0.1:8642`，請求被 SSH 透明轉發到 mac mini 的 Hermes，回 200。

---

## 步驟五：包成 npm script

每次手敲 `ssh -N -L ...` 會背到爛。寫進 `package.json`：

```json
{
  "scripts": {
    "dev": "vite",
    "tunnel": "ssh -N -L 8642:localhost:8642 ${HERMES_SSH_HOST:-mini}",
    "tunnel:status": "lsof -iTCP:8642 -sTCP:LISTEN -nP || echo 'no tunnel'",
    "tunnel:kill": "pkill -f 'ssh -N -L 8642:localhost:8642' || echo 'no tunnel'"
  }
}
```

`${HERMES_SSH_HOST:-mini}` 是 shell parameter expansion — 如果有設 `HERMES_SSH_HOST` 環境變數就用它，否則 fallback 到 `mini`。這樣以後換到別台機器也能 `HERMES_SSH_HOST=other-host npm run tunnel`。

> ⚠️ npm script 在 Windows 上 fallback 語法不同（要用 `cross-env` 之類的）— 但我這個專案只在 macOS 開發，先不管。

---

## 完整開發流程

```bash
# Terminal 1
npm run tunnel
# → 持續跑著，Ctrl-C 結束

# Terminal 2
npm run dev
# → http://localhost:5174 開啟，前後端整套都能正常用
```

---

## 心智模型小結

要把這套流程吸收，記住三層抽象：

| 層 | 它在意什麼 | 它不知道什麼 |
|---|---|---|
| **前端 (Vite)** | `127.0.0.1:8642` 有沒有人 listen | 真的後端在哪 |
| **SSH tunnel** | 把流量從筆電 8642 搬到 mac mini 的 8642 | 流量內容是 HTTP 還是其他 |
| **Hermes API** | 收到 `/v1/chat/completions` 回應 | 請求從筆電還是直接從 mac mini 來 |

每一層只看自己。**這就是所謂「不用改前端 / 後端任何一行 code」的原因** — 我們只是在中間插了一個透明的搬運層。

---

## 踩到的坑

### 坑 1：以為兩台同 Wi-Fi 就互通
`192.168.8.x` 跟 `192.168.1.x` 是不同 subnet，雖然 Wi-Fi 訊號都收得到、SSID 名字看起來像，但 router 沒做 inter-subnet routing 就是不通。最快驗證：`ping` 對方 IP，沒回就是不通。

### 坑 2：`ssh -R` vs `ssh -L` 混淆
直覺上「我要把 mac mini 的服務帶到筆電用」會想成 `-R`（remote bring back），但 `-R` 是站在 SSH server 那邊看的（在 server 上開 port）。要把筆電當入口、目標在 server 那邊，永遠用 `-L`。

### 坑 3：tunnel 看似活著但其實斷了
不加 `ServerAliveInterval` 的話，網路飄一下、TCP 沒收到 RST，OS 不知道連線斷了，`lsof` 看 8642 還在 LISTEN，但 `curl` 會永遠卡住。`ServerAliveInterval 30 + ServerAliveCountMax 3` 確保斷線後 90 秒內 SSH 一定 exit。

### 坑 4：Tailscale 直連 vs 走 relay
`tailscale status` 看到 `active; direct` 才是 P2P 直連。如果是 `active; relay "xxx"`，代表兩台中間有 NAT 沒打穿，流量繞了 Tailscale 的中繼點，延遲會明顯變高（亞洲尤其）。多數情境會 direct，但偶爾要注意。

---

## 為什麼這個做法值得寫一篇

1. **零修改原則**：前後端 code、設定都不動，只在「網路層」解決問題 — 這是好的工程直覺
2. **可逆性**：tunnel 隨時能關，沒有任何 lock-in
3. **Tailscale + SSH 的組合拳**：Tailscale 解決 L3 連通、SSH 解決 L7 port mapping、Tailscale + SSH 兩件加起來能打掉 90% 「家裡服務想在外面用」的場景
4. **學會這個之後可以做的事**：本機跑 IDE 但編譯送到家裡 GPU、用 SSH tunnel 帶回 Jupyter notebook port、把家裡的 PostgreSQL 帶到外面 client 用、...

---

## 給 AI 加工的提示

請幫我把以上素材改寫成一篇 1500–2500 字的中文部落格文章，目標讀者是會基本指令但對 SSH port forwarding 沒概念的工程師。請：

- 開頭用我的真實場景（女朋友想用我的 AI agent，所以前後端要分開部署）
- 「原理」那段請用比喻 + 圖解（如果你能畫 ASCII 或建議畫什麼）
- 保留所有指令範例，但把 inline 解釋改寫得像在跟讀者聊天
- 結尾「為什麼值得寫一篇」改成「我學到什麼」這種第一人稱反思
- 標題建議幾個（給我 3 個候選）
- 不要用條列式結尾總結，改用一段散文收
