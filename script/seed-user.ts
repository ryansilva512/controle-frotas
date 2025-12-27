import "dotenv/config";
import { randomBytes, scryptSync } from "crypto";
import { supabase } from "../server/lib/supabase";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const username = process.env.SEED_USER_USERNAME || "admin@vascotrack.local";
  const password = process.env.SEED_USER_PASSWORD || "Admin1234";
  const name = process.env.SEED_USER_NAME || "Admin";
  const role = process.env.SEED_USER_ROLE || "admin";

  const { data: existing } = await supabase
    .from("users")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  if (existing?.id) {
    console.log(`Seed user already exists: ${existing.username} (${existing.id})`);
    return;
  }

  const hashedPassword = hashPassword(password);

  const { data: created, error } = await supabase
    .from("users")
    .insert([
      {
        username,
        password: hashedPassword,
        name,
        role,
      },
    ])
    .select("id, username")
    .single();

  if (error) {
    console.error("Failed to create seed user:", error);
    process.exit(1);
  }

  console.log(`Seed user created: ${created.username} (${created.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
