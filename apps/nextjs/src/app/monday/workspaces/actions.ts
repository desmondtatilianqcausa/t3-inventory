"use server";

import { mondayApiWithRetry } from "~/app/monday/actions";

export interface Workspace {
  name?: string;
  id?: number;
  description?: string;
}

interface MondayWorkspacesApiResponse {
  data: {
    workspaces: Workspace[];
    account_id: number;
  };
}

export async function fetchAllWorkspaces() {
  "use server";
  try {
    const query = "{ workspaces (limit:100) {name id description} }";
    const result = (await mondayApiWithRetry(
      query,
    )) as MondayWorkspacesApiResponse;
    console.log("result", result);
    return result;
  } catch (error) {
    console.log("error", error);
  }
}
