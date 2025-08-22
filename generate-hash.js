import bcrypt from "bcrypt";

async function generateHash() {
  const password = "123456";
  console.log("Generating bcrypt hash for password:", password);

  try {
    const hash = await bcrypt.hash(password, 10);
    console.log("Generated hash:", hash);

    // Verify the hash works
    const isMatch = await bcrypt.compare(password, hash);
    console.log("Verification test:", isMatch ? "SUCCESS" : "FAILED");

    return hash;
  } catch (error) {
    console.error("Error generating hash:", error);
  }
}

generateHash();
