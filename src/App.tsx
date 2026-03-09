import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { AccountCard } from "./components/AccountCard";
import { AccountListItem } from "./components/AccountListItem";
import { AddAccountModal } from "./components/AddAccountModal";
import { ContextMenu } from "./components/ContextMenu";
import { DetailModal } from "./components/DetailModal";
import { Toast } from "./components/Toast";
import { ConfirmModal } from "./components/ConfirmModal";
import { InfoModal } from "./components/InfoModal";
import { UpdateTokenModal } from "./components/UpdateTokenModal";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import { About } from "./pages/About";
import { useToast } from "./hooks/useToast";
import * as api from "./api";
import type { AccountBrief, UsageSummary } from "./types";
import "./App.css";

interface AccountWithUsage extends AccountBrief {
  usage?: UsageSummary | null;
}

type ViewMode = "grid" | "list";

function App() {
  const [accounts, setAccounts] = useState<AccountWithUsage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // 使用自定义 Toast hook
  const { toasts, addToast, removeToast } = useToast();

  // Confirm弹窗状态
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "danger" | "warning" | "info";
    onConfirm: () => void;
  } | null>(null);

  // Context Menu状态
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    accountId: string;
  } | null>(null);

  // Detail Modal State
  const [detailAccount, setDetailAccount] = useState<AccountWithUsage | null>(null);

  // Refreshing Account ID
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  // Update Token 弹窗状态
  const [updateTokenModal, setUpdateTokenModal] = useState<{
    accountId: string;
    accountName: string;
  } | null>(null);

  // 信息展示弹窗状态
  const [infoModal, setInfoModal] = useState<{
    isOpen: boolean;
    title: string;
    icon: string;
    sections: Array<{
      title?: string;
      content: string;
      type?: "text" | "code" | "list";
    }>;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  // Load Account List
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getAccounts();

      // Display accounts immediately
      setAccounts(list.map((account) => ({ ...account, usage: undefined })));
      setLoading(false);

      // 后台并行加载使用量
      if (list.length > 0) {
        const usageResults = await Promise.allSettled(
          list.map((account) => api.getAccountUsage(account.id))
        );

        setAccounts((prev) =>
          prev.map((account, index) => {
            const result = usageResults[index];
            return {
              ...account,
              usage: result.status === 'fulfilled' ? result.value : null
            };
          })
        );
      }
    } catch (err: any) {
      setError(err.message || "加载Account失败");
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Auto RefreshExpiring的 Token
  useEffect(() => {
    // 启动时Refresh
    api.refreshAllTokens().then((refreshed) => {
      if (refreshed.length > 0) {
        console.log(`[INFO] 启动时Auto Refresh了 ${refreshed.length} 个 Token`);
        loadAccounts();
      }
    }).catch(console.error);

    // 每30分钟Refresh一次
    const interval = setInterval(() => {
      api.refreshAllTokens().then((refreshed) => {
        if (refreshed.length > 0) {
          console.log(`[INFO] 定时Auto Refresh了 ${refreshed.length} 个 Token`);
          loadAccounts();
        }
      }).catch(console.error);
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadAccounts]);

  // Add Account
  const handleAddAccount = async (token: string, cookies?: string) => {
    await api.addAccountByToken(token, cookies);
    addToast("success", "AccountAddSuccess");
    await loadAccounts();
  };

  // 删除Account
  const handleDeleteAccount = async (accountId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "删除Account",
      message: "OK要删除此Account吗？删除后无法恢复。",
      type: "danger",
      onConfirm: async () => {
        try {
          await api.removeAccount(accountId);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(accountId);
            return next;
          });
          addToast("success", "AccountDeleted");
          await loadAccounts();
        } catch (err: any) {
          addToast("error", err.message || "删除Account失败");
        }
        setConfirmModal(null);
      },
    });
  };

  // Refresh单Accounts
  const handleRefreshAccount = async (accountId: string) => {
    // 防止重复Refresh
    if (refreshingIds.has(accountId)) {
      return;
    }

    setRefreshingIds((prev) => new Set(prev).add(accountId));

    try {
      const usage = await api.getAccountUsage(accountId);
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, usage } : a))
      );
      addToast("success", "数据RefreshSuccess");
    } catch (err: any) {
      addToast("error", err.message || "Refresh失败");
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  // 选择Account
  const handleSelectAccount = (accountId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  // Select All/None
  const handleSelectAll = () => {
    if (selectedIds.size === accounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accounts.map((a) => a.id)));
    }
  };

  // Context Menu
  const handleContextMenu = (e: React.MouseEvent, accountId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, accountId });
  };

  // Copy Token
  const handleCopyToken = async (accountId: string) => {
    try {
      const account = await api.getAccount(accountId);
      if (account.jwt_token) {
        await navigator.clipboard.writeText(account.jwt_token);
        addToast("success", "Token 已复制到剪贴板");
      } else {
        addToast("warning", "该Account没有有效的 Token");
      }
    } catch (err: any) {
      addToast("error", err.message || "获取 Token 失败");
    }
  };

  // 切换Account
  const handleSwitchAccount = async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    setConfirmModal({
      isOpen: true,
      title: "切换Account",
      message: `OK要切换到Account "${account.email || account.name}" 吗？\n\n系统将自动Close Trae IDE 并切换登录信息。`,
      type: "warning",
      onConfirm: async () => {
        setConfirmModal(null);
        addToast("info", "正In切换Account，请稍候...");
        try {
          await api.switchAccount(accountId);
          await loadAccounts();
          addToast("success", "Account切换Success，请重新Open Trae IDE");
        } catch (err: any) {
          addToast("error", err.message || "切换Account失败");
        }
      },
    });
  };

  // View Details
  const handleViewDetail = async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (account) {
      try {
        // Get full account details (token & cookies)
        const fullAccount = await api.getAccount(accountId);
        setDetailAccount({ ...account, ...fullAccount });
      } catch (err: any) {
        addToast("error", "获取Account Details失败");
        console.error("获取Account Details失败:", err);
      }
    }
  };

  // Update Token
  const handleUpdateToken = async (accountId: string, token: string) => {
    try {
      const usage = await api.updateAccountToken(accountId, token);
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, usage } : a))
      );
      addToast("success", "Token 更新Success，数据已Refresh");
    } catch (err: any) {
      throw err; // 让弹窗显示Error
    }
  };

  // OpenUpdate Token 弹窗
  const handleOpenUpdateToken = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (account) {
      setUpdateTokenModal({
        accountId,
        accountName: account.email || account.name,
      });
    }
  };

  // 获取Package
  const handleClaimGift = async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    setConfirmModal({
      isOpen: true,
      title: "获取Package",
      message: `OK要为Account "${account.email || account.name}" 领取周年Package吗？\n\n领取后将Auto RefreshAccount额度。`,
      type: "info",
      onConfirm: async () => {
        setConfirmModal(null);
        addToast("info", "正In领取Package，请稍候...");
        try {
          await api.claimGift(accountId);
          // RefreshAccount数据
          await handleRefreshAccount(accountId);
          addToast("success", "Package领取Success！额度已更新");
        } catch (err: any) {
          addToast("error", err.message || "领取Package失败");
        }
      },
    });
  };

  // 显示Export说明
  const handleShowExportInfo = () => {
    if (accounts.length === 0) {
      addToast("warning", "没有Account可以Export");
      return;
    }

    setInfoModal({
      isOpen: true,
      title: "ExportAccount说明",
      icon: "📤",
      sections: [
        {
          title: "📄 Export格式",
          content: "JSON 文件 (.json)",
          type: "text"
        },
        {
          title: "📁 保存位置",
          content: "浏览器默认下载文件夹\n文件名格式：trae-accounts-YYYY-MM-DD.json",
          type: "text"
        },
        {
          title: "📋 文件内容",
          content: `<ul>
<li>所有Account的完整信息</li>
<li>Token 和 Cookies 数据</li>
<li>使用量统计信息</li>
<li>Account创建和更新时间</li>
</ul>`,
          type: "list"
        },
        {
          title: "✅ Export后可以",
          content: `<ul>
<li>备份Account数据</li>
<li>迁移到其他设备</li>
<li>恢复误删的Account</li>
<li>分享给其他设备使用</li>
</ul>`,
          type: "list"
        },
        {
          title: "⚠️ 安全提示",
          content: `<ul>
<li><strong>Export文件包含敏感信息</strong></li>
<li><strong>请妥善保管Export的文件</strong></li>
<li><strong>不要分享给他人</strong></li>
<li>建议加密存储Export文件</li>
</ul>`,
          type: "list"
        },
        {
          content: `当前将Export ${accounts.length} Accounts`,
          type: "text"
        }
      ],
      confirmText: "开始Export",
      onConfirm: () => {
        setInfoModal(null);
        handleExportAccounts();
      }
    });
  };

  // ExportAccount
  const handleExportAccounts = async () => {
    try {
      const data = await api.exportAccounts();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName = `trae-accounts-${new Date().toISOString().split("T")[0]}.json`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast("success", `已Export ${accounts.length} Accounts到下载文件夹：${fileName}`);
    } catch (err: any) {
      addToast("error", err.message || "Export失败");
    }
  };

  // 显示Import说明
  const handleShowImportInfo = () => {
    setInfoModal({
      isOpen: true,
      title: "ImportAccount说明",
      icon: "📥",
      sections: [
        {
          title: "📄 文件格式",
          content: "JSON 文件 (.json)",
          type: "text"
        },
        {
          title: "📋 文件结构示例",
          content: `{
  "accounts": [
    {
      "id": "AccountID",
      "name": "Username",
      "email": "Email地址",
      "jwt_token": "Token字符串",
      "cookies": "Cookies字符串",
      "plan_type": "Plan Type",
      "created_at": 时间戳,
      "is_active": true,
      ...
    }
  ],
  "active_account_id": "当前活跃AccountID",
  "current_account_id": "当前使用AccountID"
}`,
          type: "code"
        },
        {
          title: "✅ Import步骤",
          content: `<ul>
<li>Confirm后选择 JSON 文件</li>
<li>系统自动验证格式</li>
<li>Import所有有效Account</li>
</ul>`,
          type: "list"
        },
        {
          title: "⚠️ 注意事项",
          content: `<ul>
<li>仅支持本AppExport的格式</li>
<li>Import会自动跳过重复Account</li>
<li>建议定期备份Account数据</li>
</ul>`,
          type: "list"
        }
      ],
      confirmText: "选择文件",
      onConfirm: () => {
        setInfoModal(null);
        handleImportAccounts();
      }
    });
  };

  // ImportAccount
  const handleImportAccounts = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const count = await api.importAccounts(text);
        addToast("success", `SuccessImport ${count} Accounts`);
        await loadAccounts();
      } catch (err: any) {
        addToast("error", err.message || "Import失败");
      }
    };
    input.click();
  };

  // 批量Refresh选中Account（优化：并行处理，Add进度反馈）
  const handleBatchRefresh = async () => {
    if (selectedIds.size === 0) {
      addToast("warning", "请先选择要Refresh的Account");
      return;
    }

    const ids = Array.from(selectedIds);
    addToast("info", `正InRefresh ${ids.length} Accounts...`);

    // 并行Refresh所有选中的Account
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        try {
          const usage = await api.getAccountUsage(id);
          setAccounts((prev) =>
            prev.map((a) => (a.id === id ? { ...a, usage } : a))
          );
          return { id, success: true };
        } catch (err: any) {
          return { id, success: false, error: err.message };
        }
      })
    );

    // 统计结果
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failCount = ids.length - successCount;

    if (failCount === 0) {
      addToast("success", `SuccessRefresh ${successCount} Accounts`);
    } else {
      addToast("warning", `Refresh完成：${successCount} Success，${failCount} 失败`);
    }
  };

  // 批量删除选中Account（优化：改进Error处理和反馈）
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) {
      addToast("warning", "请先选择要删除的Account");
      return;
    }

    const ids = Array.from(selectedIds);
    setConfirmModal({
      isOpen: true,
      title: "批量删除",
      message: `OK要删除选中的 ${ids.length} Accounts吗？此操作无法撤销。`,
      type: "danger",
      onConfirm: async () => {
        setConfirmModal(null);
        addToast("info", `正In删除 ${ids.length} Accounts...`);

        // 并行删除所有选中的Account
        const results = await Promise.allSettled(
          ids.map((id) => api.removeAccount(id))
        );

        // 统计结果
        const successCount = results.filter((r) => r.status === 'fulfilled').length;
        const failCount = ids.length - successCount;

        setSelectedIds(new Set());
        await loadAccounts();

        if (failCount === 0) {
          addToast("success", `Success删除 ${successCount} Accounts`);
        } else {
          addToast("warning", `删除完成：${successCount} Success，${failCount} 失败`);
        }
      },
    });
  };

  // Delete Expired/Invalid
  const handleDeleteExpiredAccounts = () => {
    // 筛选出Expired或失效的Account
    const expiredAccounts = accounts.filter((account) => {
      if (!account.token_expired_at) return false;
      const expiry = new Date(account.token_expired_at).getTime();
      if (isNaN(expiry)) return false;
      return expiry < Date.now(); // Token Expired
    });

    if (expiredAccounts.length === 0) {
      addToast("info", "没有找到Expired或失效的Account");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "删除ExpiredAccount",
      message: `检测到 ${expiredAccounts.length} 个ExpiredAccount，OK要删除吗？此操作无法撤销。`,
      type: "warning",
      onConfirm: async () => {
        setConfirmModal(null);
        addToast("info", `正In删除 ${expiredAccounts.length} 个ExpiredAccount...`);

        // 并行删除所有ExpiredAccount
        const results = await Promise.allSettled(
          expiredAccounts.map((account) => api.removeAccount(account.id))
        );

        // 统计结果
        const successCount = results.filter((r) => r.status === 'fulfilled').length;
        const failCount = expiredAccounts.length - successCount;

        setSelectedIds(new Set());
        await loadAccounts();

        if (failCount === 0) {
          addToast("success", `Success删除 ${successCount} 个ExpiredAccount`);
        } else {
          addToast("warning", `删除完成：${successCount} Success，${failCount} 失败`);
        }
      },
    });
  };

  return (
    <div className="app">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      <div className="app-content">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {currentPage === "dashboard" && (
          <Dashboard accounts={accounts} />
        )}

        {currentPage === "accounts" && (
          <>
            <header className="page-header">
              <div className="header-left">
                <h2 className="page-title">Account Management</h2>
                <p>管理您的Account</p>
              </div>
              <div className="header-right">
                <span className="account-count">共 {accounts.length} Accounts</span>
                <button
                  className="header-btn danger"
                  onClick={handleDeleteExpiredAccounts}
                  title="删除所有ExpiredAccount"
                  disabled={accounts.length === 0}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  删除Expired
                  {(() => {
                    const expiredCount = accounts.filter((account) => {
                      if (!account.token_expired_at) return false;
                      const expiry = new Date(account.token_expired_at).getTime();
                      if (isNaN(expiry)) return false;
                      return expiry < Date.now();
                    }).length;
                    return expiredCount > 0 ? <span className="badge-count">{expiredCount}</span> : null;
                  })()}
                </button>
                <button className="header-btn" onClick={handleShowImportInfo} title="ImportAccount">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Import
                </button>
                <button className="header-btn" onClick={handleShowExportInfo} title="ExportAccount" disabled={accounts.length === 0}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  Export
                </button>
                <button className="add-btn" onClick={() => setShowAddModal(true)}>
                  <span>+</span> Add Account
                </button>
              </div>
            </header>

            <main className="app-main">
              {accounts.length > 0 && (
                <div className="toolbar">
                  <div className="toolbar-left">
                    <label className="select-all">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === accounts.length && accounts.length > 0}
                        onChange={handleSelectAll}
                      />
                      全选 ({selectedIds.size}/{accounts.length})
                    </label>
                    {selectedIds.size > 0 && (
                      <div className="batch-actions">
                        <button className="batch-btn" onClick={handleBatchRefresh}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                          </svg>
                          Refresh
                        </button>
                        <button className="batch-btn danger" onClick={handleBatchDelete}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="toolbar-right">
                    <div className="view-toggle">
                      <button
                        className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                        onClick={() => setViewMode("grid")}
                        title="卡片视图"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <rect x="3" y="3" width="7" height="7"/>
                          <rect x="14" y="3" width="7" height="7"/>
                          <rect x="3" y="14" width="7" height="7"/>
                          <rect x="14" y="14" width="7" height="7"/>
                        </svg>
                      </button>
                      <button
                        className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                        onClick={() => setViewMode("list")}
                        title="列表视图"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="8" y1="6" x2="21" y2="6"/>
                          <line x1="8" y1="12" x2="21" y2="12"/>
                          <line x1="8" y1="18" x2="21" y2="18"/>
                          <line x1="3" y1="6" x2="3.01" y2="6"/>
                          <line x1="3" y1="12" x2="3.01" y2="12"/>
                          <line x1="3" y1="18" x2="3.01" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Loading...</p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h3>No Accounts</h3>
                  <p>点击上方按钮Add Account，或Import已有Account</p>
                  <div className="empty-actions">
                    <button className="empty-btn primary" onClick={() => setShowAddModal(true)}>
                      Add Account
                    </button>
                    <button className="empty-btn" onClick={handleImportAccounts}>
                      ImportAccount
                    </button>
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div className="account-grid">
                  {accounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      usage={account.usage || null}
                      selected={selectedIds.has(account.id)}
                      onSelect={handleSelectAccount}
                      onContextMenu={handleContextMenu}
                    />
                  ))}
                </div>
              ) : (
                <div className="account-list">
                  <div className="list-header">
                    <div className="list-col checkbox"></div>
                    <div className="list-col avatar"></div>
                    <div className="list-col info">Account信息</div>
                    <div className="list-col plan">套餐</div>
                    <div className="list-col usage">使用量</div>
                    <div className="list-col reset">Reset Time</div>
                    <div className="list-col status">状态</div>
                    <div className="list-col actions"></div>
                  </div>
                  {accounts.map((account) => (
                    <AccountListItem
                      key={account.id}
                      account={account}
                      usage={account.usage || null}
                      selected={selectedIds.has(account.id)}
                      onSelect={handleSelectAccount}
                      onContextMenu={handleContextMenu}
                    />
                  ))}
                </div>
              )}
            </main>
          </>
        )}

        {currentPage === "settings" && (
          <>
            <header className="page-header">
              <div className="header-left">
                <h2 className="page-title">Settings</h2>
                <p>配置App程序选项</p>
              </div>
            </header>
            <Settings onToast={addToast} />
          </>
        )}

        {currentPage === "about" && (
          <>
            <header className="page-header">
              <div className="header-left">
                <h2 className="page-title">About</h2>
                <p>App程序信息</p>
              </div>
            </header>
            <About />
          </>
        )}
      </div>

      {/* Toast 通知 */}
      <Toast messages={toasts} onRemove={removeToast} />

      {/* Confirm弹窗 */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmText="OK"
          cancelText="Cancel"
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* 信息展示弹窗 */}
      {infoModal && (
        <InfoModal
          isOpen={infoModal.isOpen}
          title={infoModal.title}
          icon={infoModal.icon}
          sections={infoModal.sections}
          confirmText={infoModal.confirmText}
          onConfirm={infoModal.onConfirm}
          onCancel={() => setInfoModal(null)}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onViewDetail={() => {
            handleViewDetail(contextMenu.accountId);
            setContextMenu(null);
          }}
          onRefresh={() => {
            handleRefreshAccount(contextMenu.accountId);
            setContextMenu(null);
          }}
          onUpdateToken={() => {
            handleOpenUpdateToken(contextMenu.accountId);
            setContextMenu(null);
          }}
          onCopyToken={() => {
            handleCopyToken(contextMenu.accountId);
            setContextMenu(null);
          }}
          onSwitchAccount={() => {
            handleSwitchAccount(contextMenu.accountId);
            setContextMenu(null);
          }}
          onClaimGift={() => {
            handleClaimGift(contextMenu.accountId);
            setContextMenu(null);
          }}
          onDelete={() => {
            handleDeleteAccount(contextMenu.accountId);
            setContextMenu(null);
          }}
          isCurrent={accounts.find(a => a.id === contextMenu.accountId)?.is_current || false}
        />
      )}

      {/* Add Account弹窗 */}
      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddAccount}
        onToast={addToast}
        onAccountAdded={loadAccounts}
      />

      {/* 详情弹窗 */}
      <DetailModal
        isOpen={!!detailAccount}
        onClose={() => setDetailAccount(null)}
        account={detailAccount}
        usage={detailAccount?.usage || null}
      />

      {/* Update Token 弹窗 */}
      <UpdateTokenModal
        isOpen={!!updateTokenModal}
        accountId={updateTokenModal?.accountId || ""}
        accountName={updateTokenModal?.accountName || ""}
        onClose={() => setUpdateTokenModal(null)}
        onUpdate={handleUpdateToken}
      />
    </div>
  );
}

export default App;
