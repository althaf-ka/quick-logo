const payload = {
  model: "nano-banana-2",
  parameters: {
    width: 1376,
    height: 768,
    prompt: "a portrait-style photograph featuring a koala",
    quantity: 1,
    prompt_enhance: "OFF"
  },
  public: false
};
console.log(JSON.stringify(payload, null, 2));
