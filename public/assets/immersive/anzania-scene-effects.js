const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 v_uv;

  uniform sampler2D u_from;
  uniform sampler2D u_to;
  uniform sampler2D u_dust;
  uniform vec2 u_resolution;
  uniform vec2 u_from_size;
  uniform vec2 u_to_size;
  uniform vec2 u_dust_size;
  uniform vec2 u_sun_anchor;
  uniform float u_progress;
  uniform float u_direction;
  uniform float u_time;
  uniform int u_power;

  float hash21(vec2 value) {
    value = fract(value * vec2(123.34, 456.21));
    value += dot(value, value + 45.32);
    return fract(value.x * value.y);
  }

  float noise21(vec2 value) {
    vec2 cell = floor(value);
    vec2 local = fract(value);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  float fbm(vec2 value) {
    float result = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
    for (int octave = 0; octave < 4; octave += 1) {
      result += amplitude * noise21(value);
      value = rotation * value * 2.03 + 17.17;
      amplitude *= 0.5;
    }
    return result;
  }

  vec2 cover_uv(vec2 uv, vec2 image_size) {
    float viewport_aspect = u_resolution.x / max(u_resolution.y, 1.0);
    float image_aspect = image_size.x / max(image_size.y, 1.0);
    vec2 covered = uv;
    if (viewport_aspect < image_aspect) {
      float visible_width = viewport_aspect / image_aspect;
      covered.x = (uv.x - 0.5) * visible_width + 0.5;
    } else {
      float visible_height = image_aspect / viewport_aspect;
      covered.y = (uv.y - 0.5) * visible_height + 0.5;
    }
    return clamp(covered, 0.001, 0.999);
  }

  vec4 sample_from(vec2 uv) {
    return texture2D(u_from, cover_uv(uv, u_from_size));
  }

  vec4 sample_to(vec2 uv) {
    return texture2D(u_to, cover_uv(uv, u_to_size));
  }

  vec3 dune_surf(vec2 uv, float progress) {
    float direction_axis = u_direction > 0.0 ? uv.x : 1.0 - uv.x;
    float field = direction_axis + (fbm(vec2(uv.x * 3.2, uv.y * 5.4) - vec2(u_time * 0.025, 0.0)) - 0.5) * 0.07;
    float edge = progress * 1.28 - 0.14;
    float reveal = 1.0 - smoothstep(edge - 0.085, edge + 0.085, field);
    float travel = u_direction * 0.026;
    vec3 outgoing = sample_from(uv + vec2(travel * progress, 0.0)).rgb;
    vec3 incoming = sample_to(uv - vec2(travel * (1.0 - progress), 0.0)).rgb;
    vec3 color = mix(outgoing, incoming, reveal);

    vec2 dust_uv = cover_uv(uv, u_dust_size);
    if (u_direction < 0.0) dust_uv.x = 1.0 - dust_uv.x;
    dust_uv.x = clamp(
      dust_uv.x - u_direction * (progress - 0.5) * 0.09,
      0.001,
      0.999
    );
    vec3 dust = texture2D(u_dust, dust_uv).rgb;
    float dust_luma = max(dust.r, max(dust.g, dust.b));
    float dust_peak = pow(sin(3.14159265 * progress), 1.8);
    float dust_mask = smoothstep(0.035, 0.42, dust_luma) * dust_peak * 0.34;
    return color + dust * dust_mask * 0.70;
  }

  vec3 sandfold(vec2 uv, float progress) {
    float grain = fbm(uv * vec2(4.4, 5.8) + vec2(0.0, u_time * 0.015));
    float fine_grain = noise21(uv * vec2(28.0, 20.0) - u_time * 0.01);
    float field = uv.y + (grain - 0.5) * 0.19 + (fine_grain - 0.5) * 0.025;
    float threshold = mix(-0.18, 1.18, progress);
    float reveal = smoothstep(field - 0.055, field + 0.055, threshold);
    vec2 breathing = (uv - 0.5) * (0.018 * sin(3.14159265 * progress));
    vec3 outgoing = sample_from(uv + breathing).rgb;
    vec3 incoming = sample_to(uv - breathing * 0.65).rgb;
    vec3 color = mix(outgoing, incoming, reveal);
    float edge_peak = pow(sin(3.14159265 * progress), 0.7);
    float edge = (1.0 - smoothstep(0.0, 0.032, abs(threshold - field))) * edge_peak;
    vec3 warm_edge = vec3(0.86, 0.57, 0.30) * edge * 0.125;
    return color + warm_edge;
  }

  vec3 solar_step(vec2 uv, float progress) {
    float reveal = smoothstep(0.39, 0.61, progress);
    float lift = 0.018;
    vec3 outgoing = sample_from(uv + vec2(0.0, lift * progress)).rgb;
    vec3 incoming = sample_to(uv - vec2(0.0, lift * (1.0 - progress))).rgb;
    vec3 color = mix(outgoing, incoming, reveal);
    float bloom_peak = pow(sin(3.14159265 * progress), 5.0);
    vec2 aspect_uv = vec2((uv.x - u_sun_anchor.x) * u_resolution.x / max(u_resolution.y, 1.0), uv.y - u_sun_anchor.y);
    float bloom = 1.0 - smoothstep(0.02, 0.68, length(aspect_uv));
    bloom = pow(bloom, 1.7) * bloom_peak;
    color *= 1.0 + bloom_peak * 0.055;
    color += vec3(1.0, 0.78, 0.48) * bloom * 0.19;
    return color;
  }

  vec3 reality_fold(vec2 uv, float progress) {
    float fold = sin(3.14159265 * progress);
    float seam_anchor = 0.39;
    float distance_to_seam = abs(uv.x - seam_anchor);
    float side = uv.x < seam_anchor ? -1.0 : 1.0;
    float local_fold = exp(-distance_to_seam * 9.0) * fold;
    vec2 refracted_uv = uv + vec2(side * local_fold * 0.014, 0.0);
    float reveal = smoothstep(0.44, 0.56, progress);
    vec3 outgoing = sample_from(refracted_uv).rgb;
    vec3 incoming = sample_to(refracted_uv - vec2(side * local_fold * 0.005, 0.0)).rgb;
    vec3 color = mix(outgoing, incoming, reveal);
    float fold_shadow = exp(-distance_to_seam * 18.0) * fold;
    float seam = exp(-distance_to_seam * 170.0) * fold;
    color *= 1.0 - fold_shadow * 0.105;
    color += vec3(0.72, 0.78, 0.84) * seam * 0.16;
    return color;
  }

  void main() {
    float raw_progress = clamp(u_progress, 0.0, 1.0);
    if (raw_progress <= 0.0001) {
      gl_FragColor = sample_from(v_uv);
      return;
    }
    if (raw_progress >= 0.9999) {
      gl_FragColor = sample_to(v_uv);
      return;
    }
    float progress = smoothstep(0.0, 1.0, raw_progress);
    vec3 color;
    if (u_power == 0) {
      color = dune_surf(v_uv, progress);
    } else if (u_power == 1) {
      color = sandfold(v_uv, progress);
    } else if (u_power == 2) {
      color = solar_step(v_uv, progress);
    } else {
      color = reality_fold(v_uv, progress);
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

const powerIndexes = {
  "dune-surfing": 0,
  "sand-teleportation": 1,
  "solar-propulsion": 2,
  "reality-bending": 3,
};

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create scene-effects shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create scene-effects program.");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unknown program error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function createTexture(gl, image) {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Unable to create scene-effects texture.");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return texture;
}

async function loadImage(source) {
  const image = new Image();
  image.decoding = "async";
  image.src = source;
  if (typeof image.decode === "function") {
    await image.decode();
  } else {
    await new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
    });
  }
  return image;
}

export function createSceneEffects(canvas, { onContextLost } = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) return null;

  let gl;
  let program;
  try {
    gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) return null;
    program = createProgram(gl);
  } catch {
    return null;
  }

  const positions = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positions);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const locations = {
    position: gl.getAttribLocation(program, "a_position"),
    from: gl.getUniformLocation(program, "u_from"),
    to: gl.getUniformLocation(program, "u_to"),
    dust: gl.getUniformLocation(program, "u_dust"),
    resolution: gl.getUniformLocation(program, "u_resolution"),
    fromSize: gl.getUniformLocation(program, "u_from_size"),
    toSize: gl.getUniformLocation(program, "u_to_size"),
    dustSize: gl.getUniformLocation(program, "u_dust_size"),
    sunAnchor: gl.getUniformLocation(program, "u_sun_anchor"),
    progress: gl.getUniformLocation(program, "u_progress"),
    direction: gl.getUniformLocation(program, "u_direction"),
    time: gl.getUniformLocation(program, "u_time"),
    power: gl.getUniformLocation(program, "u_power"),
  };

  gl.useProgram(program);
  gl.enableVertexAttribArray(locations.position);
  gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

  const textureCache = new Map();
  const dustSource = new URL(
    "./effects/dune-surf-dust-v01.webp",
    import.meta.url,
  ).href;
  let activeFrame = 0;
  let transition = null;
  let contextLost = false;

  canvas.addEventListener("webglcontextlost", () => {
    contextLost = true;
    stop({ clear: false });
    onContextLost?.();
  });

  async function textureFor(source) {
    if (!source) throw new Error("A scene source is required.");
    if (contextLost)
      throw new Error("The scene-effects context is unavailable.");
    if (!textureCache.has(source)) {
      const pendingTexture = loadImage(source)
        .then((image) => ({
          texture: createTexture(gl, image),
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        }))
        .catch((error) => {
          textureCache.delete(source);
          throw error;
        });
      textureCache.set(source, pendingTexture);
    }
    return textureCache.get(source);
  }

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * scale));
    const height = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  function bindTexture(unit, location, entry) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
    gl.uniform1i(location, unit);
  }

  function render(progress, elapsed = 0) {
    if (!transition || contextLost || gl.isContextLost()) return;
    resize();
    gl.useProgram(program);
    bindTexture(0, locations.from, transition.from);
    bindTexture(1, locations.to, transition.to);
    bindTexture(2, locations.dust, transition.dust);
    gl.uniform2f(locations.resolution, canvas.width, canvas.height);
    gl.uniform2f(
      locations.fromSize,
      transition.from.width,
      transition.from.height,
    );
    gl.uniform2f(locations.toSize, transition.to.width, transition.to.height);
    gl.uniform2f(
      locations.dustSize,
      transition.dust.width,
      transition.dust.height,
    );
    gl.uniform2f(
      locations.sunAnchor,
      transition.sunAnchor[0],
      1 - transition.sunAnchor[1],
    );
    gl.uniform1f(locations.progress, progress);
    gl.uniform1f(locations.direction, transition.direction);
    gl.uniform1f(locations.time, elapsed / 1_000);
    gl.uniform1i(locations.power, transition.powerIndex);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function captureFrameSignature() {
    gl.finish();
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(
      0,
      0,
      canvas.width,
      canvas.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      throw new Error(
        `Unable to read scene-effects pixels: WebGL error ${error}.`,
      );
    }
    let hashA = 2_166_136_261;
    let hashB = 3_735_928_559;
    let opaquePixels = 0;
    for (let index = 0; index < pixels.length; index += 1) {
      const value = pixels[index];
      if (value === undefined) continue;
      hashA = Math.imul(hashA ^ value, 16_777_619);
      hashB = Math.imul(hashB + value, 2_246_822_519) ^ (hashB >>> 13);
      if (index % 4 === 3 && value > 0) opaquePixels += 1;
    }
    return {
      signature: `${canvas.width}x${canvas.height}:${hashA >>> 0}:${hashB >>> 0}`,
      opaquePixels,
      pixelCount: canvas.width * canvas.height,
    };
  }

  function stop({ clear = true } = {}) {
    window.cancelAnimationFrame(activeFrame);
    activeFrame = 0;
    transition = null;
    canvas.classList.remove("is-active");
    if (clear && !contextLost && !gl.isContextLost()) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  async function prepare(options) {
    const powerIndex = powerIndexes[options.powerId] ?? 1;
    const [from, to] = await Promise.all([
      textureFor(options.fromSource),
      textureFor(options.toSource),
    ]);
    const dust = powerIndex === 0 ? await textureFor(dustSource) : from;
    if (contextLost || gl.isContextLost()) {
      throw new Error("The scene-effects context was lost during preparation.");
    }
    transition = {
      from,
      to,
      dust,
      direction: options.direction < 0 ? -1 : 1,
      duration: Math.max(40, options.duration || 2_000),
      powerIndex,
      sunAnchor: options.sunAnchor || [0.58, 0.3],
    };
    return true;
  }

  async function preloadTransition(options) {
    if (contextLost || gl.isContextLost()) return false;
    const powerIndex = powerIndexes[options.powerId] ?? 1;
    await Promise.all([
      textureFor(options.fromSource),
      textureFor(options.toSource),
      ...(powerIndex === 0 ? [textureFor(dustSource)] : []),
    ]);
    return true;
  }

  async function start(options) {
    stop();
    await prepare(options);
    canvas.classList.add("is-active");
    const startTime = performance.now();
    const tick = (now) => {
      if (!transition) return;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / transition.duration);
      render(progress, elapsed);
      if (progress < 1) {
        activeFrame = window.requestAnimationFrame(tick);
      }
    };
    render(0, 0);
    activeFrame = window.requestAnimationFrame(tick);
    return true;
  }

  async function preview(options) {
    stop();
    await prepare(options);
    canvas.classList.add("is-active");
    const progress = Math.max(0, Math.min(1, options.progress ?? 0.5));
    render(progress, 1_000);
    return captureFrameSignature();
  }

  return {
    get available() {
      return !contextLost && !gl.isContextLost();
    },
    start,
    stop,
    preview,
    preload: textureFor,
    preloadTransition,
  };
}
