"use server";

import { api } from "~/trpc/server";

export async function getFormData(id: number) {
  try {
    const result = await api.formResponse.getFormResponseById.query({
      id,
    });

    return result;
  } catch (error) {
    console.log("error", error);
  }
}
