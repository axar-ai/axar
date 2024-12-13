module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	//collectCoverage: true, // Enable coverage collection
	//coverageDirectory: "coverage", // Directory to output coverage files
	//coverageReporters: ["json", "text", "lcov", "clover"], // Coverage formats
	collectCoverageFrom: ["src/**/*.{ts,tsx,js,jsx}"],
	reporters: [
		"default",
		[
			"jest-junit",
			{ outputDirectory: "./reports", outputName: "jest-report.xml" },
		],
	],
	testMatch: ["**/test/**/*.test.ts"],
	moduleDirectories: ["node_modules", "src"], // Ensure Jest can resolve modules in the 'src' folder
};
