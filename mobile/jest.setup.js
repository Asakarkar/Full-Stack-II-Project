/* global jest */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-secure-store", () => {
  let store = {};
  return {
    getItemAsync: jest.fn(async (key) => store[key] || null),
    setItemAsync: jest.fn(async (key, value) => {
      store[key] = String(value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      delete store[key];
    }),
    __resetMock: () => {
      store = {};
    },
  };
});

// Suppress known reanimated / font warnings in test environment
global.__reanimatedWorkletInit = jest.fn();
