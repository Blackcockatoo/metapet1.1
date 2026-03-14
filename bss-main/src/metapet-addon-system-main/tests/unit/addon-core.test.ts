import { listAddonTemplates, moss60AuraTemplate, parseAddonTemplate } from "@bluesnake-studios/addon-core";

describe("addon-core", () => {
  it("registers the built-in MOSS60 templates", () => {
    expect(listAddonTemplates()).toHaveLength(3);
  });

  it("parses a template through the shared schema", () => {
    expect(parseAddonTemplate(moss60AuraTemplate).id).toBe("moss60-aura");
  });
});
