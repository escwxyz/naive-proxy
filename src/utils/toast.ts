import { showToast, Toast } from "@raycast/api";

export async function showSuccessToast(title: string, message?: string) {
  await showToast({ title, message, style: Toast.Style.Success });
}

export async function showErrorToast(title: string, message?: string) {
  await showToast({ title, message, style: Toast.Style.Failure });
}
