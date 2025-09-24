export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callMondayApi(
  query: string,
  variables: any,
  retries = 5,
) {
  const mondayApiUrl = "https://api.monday.com/v2";
  const token = process.env.MONDAY_API_TOKEN as string;
  let attempt = 0;
  while (attempt < retries) {
    try {
      const res = await fetch(mondayApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ?? "",
        },
        body: JSON.stringify({ query, variables }),
      });
      if (res.status === 429) {
        await sleep(2 ** attempt * 500);
        attempt++;
        continue;
      }
      const data = (await res.json()) as any;
      if (data.errors)
        throw new Error(data.errors?.[0]?.message ?? "Monday error");
      return data;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await sleep(2 ** attempt * 500);
      attempt++;
    }
  }
}
