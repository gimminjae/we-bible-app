import {
  deleteObject,
  json,
  secret,
  storageRpc,
} from "../_shared/community-storage.ts";

// Invoked by pg_cron/pg_net with a dedicated secret from Vault (see deployment guide).
Deno.serve(async (req) => {
  if (
    req.method !== "POST" ||
    req.headers.get("Authorization") !==
      `Bearer ${secret("COMMUNITY_CLEANUP_SECRET")}`
  ) return json({ error: "PERMISSION_DENIED" }, 401);
  try {
    const jobs = await storageRpc<{ object_key: string; generation: number }[]>(
      "cleanup",
      null,
      null,
    );
    let deleted = 0;
    for (const job of jobs) {
      try {
        await deleteObject(job.object_key);
        await storageRpc("cleanup_done", null, null, {
          key: job.object_key,
          generation: job.generation,
        });
        deleted++;
      } catch {
        await storageRpc("cleanup_failed", null, null, {
          key: job.object_key,
          error: "S3_DELETE_FAILED",
        });
      }
    }
    return json({ attempted: jobs.length, deleted });
  } catch {
    return json({ error: "CLEANUP_FAILED" }, 500);
  }
});
