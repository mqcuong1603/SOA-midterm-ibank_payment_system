import bcrypt from "bcrypt";

const storedHash =
  "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW";
const testPassword = "password123";

async function testHash() {
  console.log("Testing bcrypt hash...");
  console.log("Password:", testPassword);
  console.log("Hash:", storedHash);

  try {
    const isMatch = await bcrypt.compare(testPassword, storedHash);
    console.log("Password matches hash:", isMatch);

    // Let's also generate a new hash to compare
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log("New generated hash:", newHash);

    const newHashMatches = await bcrypt.compare(testPassword, newHash);
    console.log("Password matches new hash:", newHashMatches);
  } catch (error) {
    console.error("Error testing hash:", error);
  }
}

testHash();
