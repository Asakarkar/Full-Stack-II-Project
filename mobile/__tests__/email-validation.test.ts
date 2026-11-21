import { getEmailValidationError } from "../lib/emailValidation";

describe("getEmailValidationError", () => {
  it("rejects malformed or blank email addresses", () => {
    expect(getEmailValidationError("not-an-email")).toBe("Enter a valid email address.");
    expect(getEmailValidationError("")).toBe("Enter your email address.");
  });

  it("accepts a trimmed valid email address", () => {
    expect(getEmailValidationError("  learner@example.edu  ")).toBeNull();
  });
});
