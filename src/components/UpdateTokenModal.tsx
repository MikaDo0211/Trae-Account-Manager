import { useState } from "react";

interface UpdateTokenModalProps {
  isOpen: boolean;
  accountId: string;
  accountName: string;
  onClose: () => void;
  onUpdate: (accountId: string, token: string) => Promise<void>;
}

export function UpdateTokenModal({
  isOpen,
  accountId,
  accountName,
  onClose,
  onUpdate,
}: UpdateTokenModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // 从输入中提取 Token
  const extractToken = (input: string): string | null => {
    const trimmed = input.trim();

    // 情况1: 直接是 JWT Token (以 eyJ 开头)
    if (trimmed.startsWith("eyJ")) {
      return trimmed;
    }

    // 情况2: 是 JSON 响应，尝试解析
    try {
      const json = JSON.parse(trimmed);

      // GetUserToken 接口的响应格式
      if (json.Result?.Token) {
        return json.Result.Token;
      }

      // 可能是其他格式
      if (json.token) {
        return json.token;
      }
      if (json.Token) {
        return json.Token;
      }
    } catch {
      // 不是有效的 JSON，继续尝试其他方式
    }

    // 情况3: 尝试用正则提取 Token
    const tokenMatch = trimmed.match(/"Token"\s*:\s*"(eyJ[^"]+)"/);
    if (tokenMatch) {
      return tokenMatch[1];
    }

    // 情况4: 尝试提取任何 eyJ 开头的字符串
    const jwtMatch = trimmed.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (jwtMatch) {
      return jwtMatch[0];
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      setError("Please enter new Token");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = extractToken(inputValue);

      if (!token) {
        setError("Unrecognized Token. Please provide a valid Token.");
        setLoading(false);
        return;
      }

      await onUpdate(accountId, token);
      setInputValue("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Update Token Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    setInputValue("");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Update Token</h2>

        <p className="modal-desc">
          Update Token for account <strong>{accountName}</strong>.
          <br />
          <small>Make sure new Token belongs to the same user.</small>
        </p>

        <div className="token-help">
          <details>
            <summary>如何获取新 Token？</summary>
            <ol>
              <li>Open <a href="https://www.trae.ai/account-setting#usage" target="_blank" rel="noopener noreferrer">trae.ai Settings页面</a> and Login对应Account</li>
              <li>按 <kbd>F12</kbd> Open Developer Tools</li>
              <li>切换到 <strong>Network</strong> tab</li>
              <li>Refresh page</li>
   <li>Find in request list <code>GetUserToken</code></li>
              <li>Click the request, on the right find <strong>Response</strong> tab</li>
              <li>Copy the response body and paste below</li>
            </ol>
          </details>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='Paste new Token or API response...'
            rows={8}
            disabled={loading}
          />

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Updating..." : "Update Token"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
