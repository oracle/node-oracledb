const nodeVersion = process.versions.modules;

if (nodeVersion < 57) {
  console.log("\n\n");
  console.log("**************************************************************");
  console.log("For Node.js v6, please run tests with command `npm run testv6`");
  console.log("**************************************************************");
  console.log("\n\n\n");
}
