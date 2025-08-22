import bcrypt from "bcrypt";

const storedHash =
  "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW";
const testPasswords = [
  "password123",
  "password",
  "123456",
  "admin",
  "test",
  "secret",
  "hello",
  "user",
  "demo",
];

async function findPassword() {
  console.log("Testing different passwords against the stored hash...");
  console.log("Hash:", storedHash);
  console.log("");

  for (const password of testPasswords) {
    try {
      const isMatch = await bcrypt.compare(password, storedHash);
      console.log(`'${password}' -> ${isMatch ? "MATCH!" : "no match"}`);
      if (isMatch) {
        console.log(`*** FOUND: The correct password is '${password}' ***`);
        break;
      }
    } catch (error) {
      console.error(`Error testing '${password}':`, error);
    }
  }

  console.log("");
  console.log("Generating correct hash for password123:");
  const correctHash = await bcrypt.hash("password123", 10);
  console.log("Correct hash for password123:", correctHash);
}

findPassword();
