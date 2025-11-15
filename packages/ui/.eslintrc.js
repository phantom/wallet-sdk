module.exports = {
  extends: ["../../.eslintrc.js"],
  ignorePatterns: ["dist/**/*"],
  overrides: [
    {
      files: ["*.native.tsx", "*.native.ts"],
      rules: {
        "import/no-extraneous-dependencies": [
          "error",
          {
            devDependencies: true,
            optionalDependencies: false,
            peerDependencies: true,
          },
        ],
      },
    },
  ],
};
