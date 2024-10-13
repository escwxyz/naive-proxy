import { showToast, Toast } from "@raycast/api";
import fs from "fs/promises";

export async function showSuccessToast(title: string, message?: string) {
 await showToast({ title, message, style: Toast.Style.Success });
}

export async function showErrorToast(title: string, message?: string) {
  await showToast({ title, message, style: Toast.Style.Failure });
}

export async function isExecutable(path: string): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.X_OK);
    return true;
  } catch (err) {
    return false;
  }
}
