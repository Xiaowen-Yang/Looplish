import type {
  ExtensionRequest,
  ExtensionResponse,
  PageStudyPayload
} from "../shared/messages";

async function getActiveYouTubeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://www.youtube.com/watch")) {
    throw new Error("请先在当前窗口打开一个 YouTube 视频。");
  }
  return tab;
}

export async function sendToActiveTab<T>(request: ExtensionRequest): Promise<T> {
  const tab = await getActiveYouTubeTab();
  let response: ExtensionResponse<T> | undefined;

  try {
    response = await chrome.tabs.sendMessage(tab.id!, request) as ExtensionResponse<T>;
  } catch {
    throw new Error("无法连接视频页面，请刷新 YouTube 页面后重试。");
  }

  if (!response?.ok) {
    throw new Error(response?.error ?? "YouTube 页面没有返回数据。");
  }
  return response.data;
}

export function loadPageStudy(): Promise<PageStudyPayload> {
  return sendToActiveTab<PageStudyPayload>({ type: "GET_PAGE_STUDY" });
}

