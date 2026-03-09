import { invoke } from "@tauri-apps/api/core";
import type { Account, AccountBrief, UsageSummary, UsageEventsResponse } from "./types";

// Add Account（通过 Cookies）
export async function addAccount(cookies: string): Promise<Account> {
  return invoke("add_account", { cookies });
}

// Add Account（通过 Token，可选 Cookies）
export async function addAccountByToken(token: string, cookies?: string): Promise<Account> {
  return invoke("add_account_by_token", { token, cookies });
}

// 删除Account
export async function removeAccount(accountId: string): Promise<void> {
  return invoke("remove_account", { accountId });
}

// 获取所有Account
export async function getAccounts(): Promise<AccountBrief[]> {
  return invoke("get_accounts");
}

// 获取单个Account Details（包含 token）
export async function getAccount(accountId: string): Promise<Account> {
  return invoke("get_account", { accountId });
}

// Settings活跃Account
export async function setActiveAccount(accountId: string): Promise<void> {
  return invoke("switch_account", { accountId });
}

// 切换Account（Settings活跃Account并更新Machine ID）
export async function switchAccount(accountId: string): Promise<void> {
  return invoke("switch_account", { accountId });
}

// 获取Account使用量
export async function getAccountUsage(accountId: string): Promise<UsageSummary> {
  return invoke("get_account_usage", { accountId });
}

// 更新Account Token
export async function updateAccountToken(accountId: string, token: string): Promise<UsageSummary> {
  return invoke("update_account_token", { accountId, token });
}

// Refresh Token
export async function refreshToken(accountId: string): Promise<void> {
  return invoke("refresh_token", { accountId });
}

// 更新 Cookies
export async function updateCookies(accountId: string, cookies: string): Promise<void> {
  return invoke("update_cookies", { accountId, cookies });
}

// ExportAccount
export async function exportAccounts(): Promise<string> {
  return invoke("export_accounts");
}

// ImportAccount
export async function importAccounts(data: string): Promise<number> {
  return invoke("import_accounts", { data });
}

// 获取Usage Events
export async function getUsageEvents(
  accountId: string,
  startTime: number,
  endTime: number,
  pageNum: number = 1,
  pageSize: number = 20
): Promise<UsageEventsResponse> {
  return invoke("get_usage_events", {
    accountId,
    startTime,
    endTime,
    pageNum,
    pageSize
  });
}

// 从 Trae IDE 读取当前登录Account
export async function readTraeAccount(): Promise<Account | null> {
  return invoke("read_trae_account");
}

// ============ Machine ID相关 API ============

// 获取当前系统Machine ID
export async function getMachineId(): Promise<string> {
  return invoke("get_machine_id");
}

// 重置系统Machine ID（生成新的随机Machine ID）
export async function resetMachineId(): Promise<string> {
  return invoke("reset_machine_id");
}

// Settings系统Machine ID为指定值
export async function setMachineId(machineId: string): Promise<void> {
  return invoke("set_machine_id", { machineId });
}

// 绑定AccountMachine ID（保存当前系统Machine ID到Account）
export async function bindAccountMachineId(accountId: string): Promise<string> {
  return invoke("bind_account_machine_id", { accountId });
}

// ============ Trae IDE Machine ID相关 API ============

// 获取 Trae IDE 的Machine ID
export async function getTraeMachineId(): Promise<string> {
  return invoke("get_trae_machine_id");
}

// Settings Trae IDE 的Machine ID
export async function setTraeMachineId(machineId: string): Promise<void> {
  return invoke("set_trae_machine_id", { machineId });
}

// 清除 Trae IDE 登录状态（让 IDE 变成全新安装状态）
export async function clearTraeLoginState(): Promise<void> {
  return invoke("clear_trae_login_state");
}

// ============ Trae IDE 路径相关 API ============

// 获取保存的 Trae IDE 路径
export async function getTraePath(): Promise<string> {
  return invoke("get_trae_path");
}

// Settings Trae IDE 路径
export async function setTraePath(path: string): Promise<void> {
  return invoke("set_trae_path", { path });
}

// Auto Scan Trae IDE 路径
export async function scanTraePath(): Promise<string> {
  return invoke("scan_trae_path");
}

// ============ Token Refresh相关 API ============

// 批量Refresh所有Expiring的 Token
export async function refreshAllTokens(): Promise<string[]> {
  return invoke("refresh_all_tokens");
}

// ============ Package相关 API ============

// 领取Package
export async function claimGift(accountId: string): Promise<void> {
  return invoke("claim_gift", { accountId });
}

// ============ 浏览器登录 ============

// Open浏览器登录窗口
export async function startBrowserLogin(): Promise<void> {
  return invoke("start_browser_login");
}
