import NamedResourceMap from "./namedResourceMap";

import { delay, humanReadableSize } from "../core/utils";

class RendererApi {
  #gpuDevice!: GPUDevice;
  get gpuDevice() { return this.#gpuDevice; }

  #nearestSampler!: GPUSampler;
  #linearSampler!: GPUSampler;
  get nearestSampler() { return this.#nearestSampler; }
  get linearSampler() { return this.#linearSampler; }

  #shaderModules = new NamedResourceMap<GPUShaderModule>();
  #textures = new NamedResourceMap<GPUTexture>(t => t.destroy());
  #buffers = new NamedResourceMap<GPUBuffer>(b => b.destroy());
  #bindGroupLayouts = new NamedResourceMap<GPUBindGroupLayout>();
  #bindGroups = new NamedResourceMap<GPUBindGroup>();
  #pipelineLayouts = new NamedResourceMap<GPUPipelineLayout>();
  #renderPipelines = new NamedResourceMap<GPURenderPipeline>();
  get textures() { return this.#textures; }
  get buffers() { return this.#buffers; }
  get bindGroupLayouts() { return this.#bindGroupLayouts; }
  get bindGroups() { return this.#bindGroups; }
  get pipelineLayouts() { return this.#pipelineLayouts; }
  get renderPipelines() { return this.#renderPipelines; }

  // --- Initialisierung ---

  /**
   * Initialisiert die GPU-Device und die Standard-Sampler.
   * Diese Methode muss vor der Verwendung der API aufgerufen werden.
   */
  async initialize() {
    this.#gpuDevice = await this.#initializeGpuDevice();

    // Initialisiere die beiden Sampler, die in der Anwendung verwendet werden.
    // Der Nearest Sampler wird für die Darstellung von Pixel Art verwendet,
    // während der Linear Sampler für die Darstellung von hochauflösenden Texturen verwendet wird.
    this.#nearestSampler = this.#gpuDevice.createSampler({
      label: "Nearest Sampler",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
      magFilter: "nearest",
      minFilter: "nearest",
      mipmapFilter: "nearest",
      maxAnisotropy: 1,
    });
    this.#linearSampler = this.#gpuDevice.createSampler({
      label: "Linear Sampler",
      addressModeU: "repeat",
      addressModeV: "repeat",
      addressModeW: "repeat",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      maxAnisotropy: 4,
    });
  }

  async #initializeGpuDevice() {
    const { gpu } = navigator;
    if (!gpu) {
      throw new Error("WebGPU is not supported on this browser.");
    }

    // Dem Browser erlauben, die initiale UI zu rendern. Das Anfordern eines Adapters
    // kann etwas dauern und das Rendering blockieren.
    // So ist während des Wartens bereits etwas auf dem Bildschirm sichtbar.
    // (Zum Beispiel ein Lade-Kringel)
    await delay(100);

    const adapter = await gpu.requestAdapter({
      // Currently the application runs file with
      // the "compatibility" feature level.
      // However, I might want to use "core" only features
      // in the future. Therefore, I request "core" from the beginning.
      featureLevel: "core", //"compatibility",

      // The powerPreference option is currently ignored when calling requestAdapter() on Windows.
      // See https://crbug.com/369219127
      // powerPreference: "high-performance",

      // Even if forceFallbackAdapter is false, the returned adapter might still be a fallback adapter.
      // A fallback adapter typically is a software implementation and therefore really slow.
      // However, a software implementation might be the reference implementation of W3C and therefore fully support all features.
      // As of now, this is not the case - currently, there is no fallback adapter implementation on Google Chrome.
      // (And I think there isn't any on other browsers as well.)
      // This option might become deprecated before even a single browser support `true` for this option.
      forceFallbackAdapter: false,

      // I've done the first successful tests with WebXR and WebGPU bindings.
      // For now, this works only on Chrome Windows and requires additional floags to be enabled in the browser:
      // - chrome://flags/#webxr-projection-layers
      // - chrome://flags/#webxr-webgpu-binding
      // - chrome://flags/#webxr-internals
      // You must connect the Meta Quest device (USB or Air Link), render the Page on the Desktop and start the XR session
      // from within the Headset using the Remote Desktop View.
      // I will add some features to use WebXR with WebGPU in this engine. The flag set to true has no negative impact - so I keep it enabled.
      xrCompatible: true,
    });

    if (!adapter) {
      throw new Error("No suitable GPU adapter found");
    }

    if (adapter.info.isFallbackAdapter) {
      // TODO: Handle fallback adapters more gracefully.
      // Maybe add a parameter to allow the application to run on a fallback adapter.
      // For now, just throw an error.
      throw new Error("The GPU adapter is a fallback adapter. WebGPU might not be fully supported on this device.");
    }

    // Ich fordere einige moderat hohe Limits an, damit die Engine auf einer breiten Gerätebasis läuft.
    // 256 MB für Buffer und Storage-Buffer sollten für die meisten Anwendungen ausreichen.
    // - Das Limit von 1024 Texture-Array-Layern liegt über dem W3C-Minimum von 256,
    //   wird aber von den meisten Geräten unterstützt.
    // - Die 2D-Texturgröße von 4096x4096 ist sogar weit geringer als die meisten Geräte unterstützen.
    //   Der tatsächliche Wert kann je nach Gerät wiederum größer sein.
    // - Der Limit von 32 Bytes bei maxColorAttachmentBytesPerSample ist leider nötig, damit die Engine auf Firefox läuft.
    //   Chrome unterstützt hier 128 Bytes was ich gerne nutzen würde.
    // Die meisten übrigen Limits bleiben beim W3C-Minimum, da aktuell keine höheren Werte nötig sind.
    // Ein konfigurierbarer Parameter für Features und Limits könnte sinnvoll sein - später vielleicht.
    const device = await adapter.requestDevice({
      label: "GPU Device",
      requiredFeatures: [
        // Firefox unterstützt "float32-blendable" leider noch nicht.
        // "float32-blendable",
        "float32-filterable",
        // Auf Texturkompression verzichte ich vorerst, da ich aktuell noch keine Implementation zum komprimieren
        // von Texturen in JavaScript gefunden oder geschrieben habe.
        // "texture-compression-bc",
        "indirect-first-instance",
        "bgra8unorm-storage",
      ],
      requiredLimits: {
        maxBufferSize: 268435456,
        maxStorageBufferBindingSize: 268435456,
        maxColorAttachments: 4,
        maxColorAttachmentBytesPerSample: 32, // Chrome schafft 128, aber Firefox nur 32 Bytes
        maxTextureDimension1D: 1024,
        maxTextureDimension2D: 4096,
        maxTextureDimension3D: 256,
        maxTextureArrayLayers: 1024,
        maxVertexBuffers: 4,
        minStorageBufferOffsetAlignment: 256,
        minUniformBufferOffsetAlignment: 256,
        maxInterStageShaderVariables: 16,
        maxSampledTexturesPerShaderStage: 8,
        maxSamplersPerShaderStage: 8,
        maxStorageBuffersPerShaderStage: 8,
        maxStorageTexturesPerShaderStage: 4,
        maxUniformBuffersPerShaderStage: 4,
      },
      defaultQueue: {
        label: "Default GPU Queue",
      },
    });

    // Gib ein paar Informationen über den Adapter und die unterstützten Features und Limits auf der Konsole aus.
    const { info: { architecture, vendor } } = adapter;
    const { features, limits: { maxBufferSize, maxStorageBufferBindingSize, maxTextureDimension2D } } = device;
    const limits = [
      `maxBufferSize: ${humanReadableSize(maxBufferSize)}`,
      `maxStorageBufferBindingSize: ${humanReadableSize(maxStorageBufferBindingSize)}`,
      `maxTextureDimension2D: ${maxTextureDimension2D}`,
    ];

    console.log(`Adapter Info: ${vendor} ${architecture}`);
    console.log(`Features:\n- ${[...features].join("\n- ")}`);
    console.log(`Limits:\n- ${limits.join("\n- ")}`);

    return device;
  }

  // --- Shader Module Management ---
  // Shader-Module werden gesondert behandelt, da die Kompilierung einen asynchronen Validierungsprozess erfordert.

  /**
   * Gibt ein GPUShaderModule zurück, das mit dem angegebenen Label gespeichert ist.
   *
   * Wenn kein Modul mit diesem Label existiert, wird ein neues Modul mit dem angegebenen Code erstellt, validiert und gespeichert.
   * Dabei können Informationen und Warnungen auf der Konsole ausgegeben werden.
   *
   * Wenn die Kompilierung fehlschlägt, wird eine Ausnahme mit den Fehlermeldungen geworfen.
   *
   * Das zurückgegebene Modul ist garantiert gültig, d.h. es wurden keine Kompilierungsfehler gefunden.
   * @param label Das Label, unter dem das Shader-Modul gespeichert und später abgerufen werden kann.
   * @param code Der Quellcode des Shader-Moduls.
   * @throws Wenn die Kompilierung des Shader-Moduls fehlschlägt, wird eine Ausnahme mit den Fehlermeldungen geworfen.
   */
  getOrCreateShaderModule(label: string, code: string): Promise<GPUShaderModule> {
    const availableModule = this.#shaderModules.get(label);
    if (availableModule) {
      return Promise.resolve(availableModule);
    }

    const module = this.#gpuDevice.createShaderModule({
      label,
      code,
    });

    return RendererApi.validateShaderModule(module).then(() => {
      this.#shaderModules.set(label, () => module);
      return module;
    });
  }

  removeShaderModule(label: string): void {
    this.#shaderModules.delete(label);
  }

  // --- Statische Hilfs- und Debugmethoden ---

  /**
   * Validiert ein GPUShaderModule und gibt die Kompilierungsinformationen in der Konsole aus.
   * Wenn Fehler gefunden werden, wird eine Ausnahme mit den Fehlermeldungen geworfen,
   * andernfalls werden nur Warnungen und Informationen geloggt.
   * @param module The GPUShaderModule to validate.
   */
  static async validateShaderModule(module: GPUShaderModule) {
    const info = await module.getCompilationInfo();
    if (info.messages.length > 0) {
      let maxType: GPUCompilationMessageType = "info";
      const combinedMessages = info.messages.reduce<string[]>(
        (acc, cur) => {
          const { type, lineNum, linePos, message } = cur;
          if (type === "error") {
            maxType = "error";
          } else if (type === "warning" && maxType !== "error") {
            maxType = "warning";
          }
          acc.push(`- [${type}] ${lineNum}:${linePos} ${message}`);
          return acc;
        },
        [],
      );
      const label = module.label ?? "Shader Module";
      console[maxType](`${label} Compilation Info:\n${combinedMessages.join("\n")}`);
      if ((maxType as GPUCompilationMessageType) === "error") {
        throw new Error(`${label} compilation failed:\n${combinedMessages.join("\n")}`);
      }
    }
  }
}

export default RendererApi;
