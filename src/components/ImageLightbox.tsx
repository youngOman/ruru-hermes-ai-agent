import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

/**
 * 全螢幕圖片預覽。掛在三個地方：
 *   1. ChatPage 的 input 草稿縮圖（DraftAttachment）
 *   2. 訊息泡泡裡的附件圖（StoredImageThumb）
 *   3. AI 回覆的 markdown <img>（MEDIA:/path 改寫後的）
 *
 * 互動：
 *   - 點外面（overlay）關閉
 *   - ESC 關閉
 *   - 點圖片本身不關（避免誤觸）
 *   - body scroll lock — 不然背景會跟著捲
 */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <button
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="關閉預覽"
      >
        <X size={20} />
      </button>
      <img
        className="lightbox-image"
        src={src}
        alt={alt ?? ''}
        onClick={(e) => e.stopPropagation()}
      />
      <style>{`
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(5, 5, 18, 0.88);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          cursor: zoom-out;
          animation: lightbox-in 0.18s ease-out;
        }
        @keyframes lightbox-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .lightbox-image {
          max-width: 95vw;
          max-height: 90vh;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 0.6rem;
          box-shadow: 0 12px 60px rgba(0, 0, 0, 0.6);
          cursor: default;
        }
        .lightbox-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(20, 20, 50, 0.7);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.18s ease;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .lightbox-close:hover {
          background: rgba(220, 70, 90, 0.85);
          border-color: rgba(220, 70, 90, 0.5);
        }
      `}</style>
    </div>
  )
}
