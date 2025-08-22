import bcrypt from "bcrypt";

const newHash = "$2b$10$STQPLLrUX8zr8YdXlMSdxOIJ2WMBZqjlxMhDKinP6y1xPhzbw0jua";
const testPassword = "123456";

async function testNewHash() {
  console.log('Testing the new hash with password "123456"...');
  console.log("Password:", testPassword);
  console.log("Hash:", newHash);

  try {
    const isMatch = await bcrypt.compare(testPassword, newHash);
    console.log("Password matches hash:", isMatch ? "SUCCESS ✓" : "FAILED ✗");

    if (isMatch) {
      console.log("\n🎉 Great! Now you can login with:");
      console.log("Username: testuser");
      console.log("Password: 123456");
    }
  } catch (error) {
    console.error("Error testing hash:", error);
  }
}

testNewHash();
