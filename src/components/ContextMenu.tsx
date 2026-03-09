import { useEffect, useRef } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onViewDetail: () => void;
  onRefresh: () => void;
  onUpdateToken: () => void;
  onCopyToken: () => void;
  onSwitchAccount: () => void;
  onClaimGift: () => void;
  onDelete: () => void;
  isCurrent?: boolean; // 是否是当前使用的Account
}

export function ContextMenu({
  x,
  y,
  onClose,
  onViewDetail,
  onRefresh,
  onUpdateToken,
  onCopyToken,
  onSwitchAccount,
  onClaimGift,
  onDelete,
  isCurrent = false,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Adjust menu position
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();

      if (rect.right > window.innerWidth) {
        menu.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  return (
    <>
      <div className="context-menu-overlay" onClick={onClose} />
      <div
        ref={menuRef}
        className="context-menu"
        style={{ left: x, top: y }}
      >
        <div className="context-menu-item" onClick={onViewDetail}>
          <span className="icon">👁</span>
          View Details
        </div>
        <div className="context-menu-item" onClick={onRefresh}>
          <span className="icon">🔄</span>
          Refresh数据
        </div>
        <div className="context-menu-item" onClick={onUpdateToken}>
          <span className="icon">🔐</span>
          Update Token
        </div>
        <div className="context-menu-item" onClick={onCopyToken}>
          <span className="icon">🔑</span>
          Copy Token
        </div>
        <div
          className={`context-menu-item ${isCurrent ? "disabled" : ""}`}
          onClick={isCurrent ? undefined : onSwitchAccount}
          title={isCurrent ? "Already active" : "Switch Account"}
        >
          <span className="icon">{isCurrent ? "✓" : "🔀"}</span>
          {isCurrent ? "In Use" : "切换Account"}
        </div>
        <div className="context-menu-item" onClick={onClaimGift}>
          <span className="icon">🎁</span>
          获取Package
        </div>
        <div className="context-menu-divider" />
        <div className="context-menu-item danger" onClick={onDelete}>
          <span className="icon">🗑</span>
          删除Account
        </div>
      </div>
    </>
  );
}
