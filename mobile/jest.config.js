module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|expo-.*|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@reduxjs/toolkit|immer)/)",
  ],
};
