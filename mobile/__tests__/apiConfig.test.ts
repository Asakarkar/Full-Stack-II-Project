import { resolveApiBaseUrl, setApiBaseUrlOverride } from "../lib/apiConfig";

describe("API CONFIGURATION & NETWORKING", () => {
  afterEach(() => {
    setApiBaseUrlOverride(null);
  });

  it("returns override URL when set", () => {
    setApiBaseUrlOverride("http://192.168.1.150:8080/api/v1");
    expect(resolveApiBaseUrl()).toBe("http://192.168.1.150:8080/api/v1");
  });

  it("strips trailing slashes from override URL", () => {
    setApiBaseUrlOverride("http://192.168.1.150:8080/api/v1///");
    expect(resolveApiBaseUrl()).toBe("http://192.168.1.150:8080/api/v1");
  });

  it("falls back to localhost or Android IP without crashing", () => {
    const url = resolveApiBaseUrl();
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
    expect(url.startsWith("http://") || url.startsWith("https://")).toBe(true);
  });
});
