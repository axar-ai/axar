module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["**/test/**/*.test.ts"],
	moduleDirectories: ["node_modules", "src"], // Ensure Jest can resolve modules in the 'src' folder
};
