precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_renderingTexture;
uniform sampler2D u_occlusionTexture;

uniform vec2 u_resolution;
uniform float u_fov;

uniform mat4 u_inverseViewMatrix;

uniform sampler2D u_shadowDepthTexture;
uniform vec2 u_shadowResolution;
uniform mat4 u_lightProjectionViewMatrix;

// Add uniforms for color control
uniform float u_liquidHue;
uniform float u_liquidSaturation;
uniform float u_liquidBrightness;
uniform float u_colorCount;

// Add time uniform for animation
uniform float u_time;

// Thêm uniform cho từng màu cụ thể
uniform float u_hue0;
uniform float u_hue1;
uniform float u_hue2;
uniform float u_hue3;
uniform float u_hue4;
uniform float u_hue5;
uniform float u_hue6;
uniform float u_hue7;

float linearstep (float left, float right, float x) {
    return clamp((x - left) / (right - left), 0.0, 1.0);
}

vec3 hsvToRGB(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 2D Noise function
float noise2D(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    // Smooth Interpolation
    vec2 u = f*f*(3.0-2.0*f);
    
    // Mix 4 corners percentages
    return mix(a, b, u.x) + 
            (c - a)* u.y * (1.0 - u.x) + 
            (d - b) * u.x * u.y;
}

// Improve the 3D Noise function for more complex patterns
float noise3D(vec3 p) {
    // Use multiple frequencies with different modulation factors
    float n1 = sin(p.x * 8.0 + u_time * 0.3) * 
               cos(p.y * 7.5 + u_time * 0.4) * 
               sin(p.z * 6.2 + u_time * 0.1);
    
    float n2 = cos(p.x * 5.3 + u_time * 0.15) * 
               sin(p.y * 6.7 + u_time * 0.25) * 
               cos(p.z * 7.1 + u_time * 0.35);
    
    float n3 = sin(p.x * 9.1 + u_time * 0.22) * 
               sin(p.y * 8.3 + u_time * 0.18) * 
               cos(p.z * 6.9 + u_time * 0.28);
    
    return 0.5 + 0.16 * (n1 + n2 + n3);
}

// Enhanced FBM with more octaves for greater detail
float fbm(vec3 position) {
    float value = 0.0;
    float amplitude = 0.55;
    float frequency = 2.5;
    float lacunarity = 2.17;  // Frequency multiplier between octaves
    float persistence = 0.48; // Amplitude multiplier between octaves
    
    // Use more varied time offsets for each dimension
    vec3 timeOffsets = vec3(
        u_time * 0.07,
        u_time * 0.11 + 4.0,
        u_time * 0.13 + 8.0
    );
    
    // Add 6 octaves of noise for more detail
    for (int i = 0; i < 6; i++) {
        // Different offsets for each dimension to create asymmetry
        value += amplitude * noise2D(vec2(position.x, position.y + timeOffsets.x) * frequency);
        value += amplitude * noise2D(vec2(position.y + 2.3, position.z + timeOffsets.y) * (frequency * 1.1));
        value += amplitude * noise2D(vec2(position.z + 4.7, position.x + timeOffsets.z) * (frequency * 0.9));
        
        frequency *= lacunarity;
        amplitude *= persistence;
    }
    
    return value;
}

// Lấy hue dựa trên chỉ số màu
float getHueByIndex(float index) {
    // Sử dụng trực tiếp giá trị hue từ uniform
    if (index == 0.0) return u_hue0;
    if (index == 1.0) return u_hue1;
    if (index == 2.0) return u_hue2;
    if (index == 3.0) return u_hue3;
    if (index == 4.0) return u_hue4;
    if (index == 5.0) return u_hue5;
    if (index == 6.0) return u_hue6;
    if (index == 7.0) return u_hue7;
    return u_hue0; // Mặc định trả về màu đầu tiên
}

// Tạo màu dựa trên vị trí và màu từ danh sách
vec3 colorByPosition(vec3 position) {
    // Số lượng màu thực tế có sẵn
    float colorCount = max(1.0, min(8.0, u_colorCount > 0.0 ? u_colorCount : 8.0));
    
    // Tạo các điểm trung tâm liên tục di chuyển
    vec3 centers[8];
    
    // Tạo chuyển động hỗn loạn hơn cho các trung tâm màu
    for (int i = 0; i < 8; i++) {
        float idx = float(i);
        
        // Make each center move with a unique, chaotic pattern
        float baseSpeed = 0.15 + idx * 0.02;
        
        // Use prime numbers to create non-repeating patterns
        float xFreq = 0.13 + idx * 0.007;
        float yFreq = 0.11 + idx * 0.009;
        float zFreq = 0.09 + idx * 0.011;
        
        // Different amplitudes for each dimension
        float xAmp = 7.0 + sin(idx * 1.7) * 2.0;
        float yAmp = 6.0 + cos(idx * 2.3) * 2.0;
        float zAmp = 8.0 + sin(idx * 1.9) * 2.0;
        
        // Base positions that are more spread out
        vec3 baseCenter = vec3(
            15.0 + idx * 1.5 + sin(idx * 2.7) * 3.0,
            10.0 + cos(idx * 1.3) * 4.0,
            10.0 + sin(idx * 3.1) * 3.5
        );
        
        // Create more chaotic, non-uniform motion
        centers[i] = baseCenter + vec3(
            sin(u_time * xFreq) * xAmp + 
            cos(u_time * 0.23 + idx * 0.9) * 2.0,
            
            cos(u_time * yFreq) * yAmp + 
            sin(u_time * 0.19 + idx * 1.2) * 2.5,
            
            sin(u_time * zFreq) * zAmp + 
            cos(u_time * 0.17 + idx * 1.5) * 3.0
        );
        
        // Add some noise-based displacement for even more chaos
        centers[i] += vec3(
            noise2D(vec2(u_time * 0.1, idx * 3.7)) * 3.0,
            noise2D(vec2(u_time * 0.12, idx * 2.9)) * 3.0,
            noise2D(vec2(u_time * 0.14, idx * 4.1)) * 3.0
        );
    }
    
    // Use different noise factors for each color
    float noiseFactors[8];
    for (int i = 0; i < 8; i++) {
        // More varied noise factors to create distinct region characteristics
        noiseFactors[i] = 3.0 + sin(float(i) * 1.7) * 0.8 + cos(float(i) * 2.3) * 0.5;
    }
    
    // Tìm hai điểm trung tâm gần nhất
    float minDist = 1000.0;
    float colorIndex = 0.0;
    float secondMinDist = 1000.0;
    float secondColorIndex = 0.0;
    
    for (int i = 0; i < 8; i++) {
        if (float(i) >= colorCount) break;
        
        float idx = float(i);
        
        // Create distorted space with unique characteristics for each color
        vec3 weights = vec3(
            1.0 + sin(u_time * 0.21 + idx * 2.7) * 0.25 + cos(u_time * 0.17) * 0.15,
            1.0 + cos(u_time * 0.19 + idx * 3.1) * 0.3 + sin(u_time * 0.23) * 0.1,
            1.0 + sin(u_time * 0.15 + idx * 2.3) * 0.2 + cos(u_time * 0.29) * 0.25
        );
        
        // Add asymmetry to the weights
        weights *= 1.0 + noise2D(vec2(u_time * 0.1, idx)) * 0.3;
        
        // Compute distorted distance metric based on position and time
        vec3 distortedPos = position;
        
        // Apply a unique, animated distortion field for each color
        distortedPos.x += sin(position.y * 0.2 + u_time * 0.13 + idx * 1.7) * 2.5;
        distortedPos.y += cos(position.z * 0.25 + u_time * 0.11 + idx * 2.3) * 2.0;
        distortedPos.z += sin(position.x * 0.18 + u_time * 0.17 + idx * 3.1) * 3.0;
        
        // Distance calculation with non-euclidean metric to create more organic shapes
        float dist = length((distortedPos - centers[i]) * weights);
        
        // Apply complex noise patterns to the distance metric
        float noiseFactor = noiseFactors[i];
        
        // Create highly variable time offsets for more chaotic animation
        float timeOffset1 = u_time * (0.12 + idx * 0.01) + idx * 1.3;
        float timeOffset2 = u_time * (0.09 + idx * 0.015) + idx * 2.7;
        float timeOffset3 = u_time * (0.14 + idx * 0.008) + idx * 3.5;
        
        // Create complex, layered noise distortions
        dist += sin(position.x * 0.31 + position.z * 0.17 + timeOffset1) * noiseFactor * 0.7;
        dist += cos(position.y * 0.27 + position.x * 0.23 + timeOffset2) * noiseFactor * 0.8;
        dist += sin(position.z * 0.19 + position.y * 0.21 + timeOffset3) * noiseFactor * 0.9;
        
        // Add more complex 3D noise with different frequencies
        dist += noise3D(position * 0.13 + vec3(u_time * 0.11 + idx * 1.1)) * noiseFactor * 0.9;
        dist += noise3D(position * 0.19 + vec3(u_time * 0.07 + idx * 2.3)) * noiseFactor * 0.7;
        
        // Add FBM with position-dependent frequencies for more organic structures
        float fbmFreq = 0.04 + sin(idx * 2.5) * 0.01;
        dist += fbm(position * fbmFreq + vec3(u_time * 0.05 + idx * 1.7)) * noiseFactor * 2.5;
        
        // Lưu 2 khoảng cách nhỏ nhất để pha trộn
        if (dist < minDist) {
            secondMinDist = minDist;
            secondColorIndex = colorIndex;
            minDist = dist;
            colorIndex = float(i);
        } else if (dist < secondMinDist) {
            secondMinDist = dist;
            secondColorIndex = float(i);
        }
    }
    
    // Create a more dynamic, noise-influenced blend factor for smoother transitions
    float blendWidth = 7.0 + sin(u_time * 0.19) * 2.0 + 
                      fbm(position * 0.02 + vec3(u_time * 0.07)) * 3.0;
    
    // Tính trọng số pha trộn giữa 2 màu gần nhất với ranh giới không đều
    float blendFactor = smoothstep(0.0, blendWidth, secondMinDist - minDist);
    
    // Lấy hue từ danh sách màu
    float hue1 = getHueByIndex(colorIndex);
    float hue2 = getHueByIndex(secondColorIndex);
    
    // Use a third hue based on blending first two to create more complex transitions
    float hue3 = mix(hue1, hue2, 0.5) + 0.15; // Slightly shifted third color
    hue3 = mod(hue3, 1.0);
    
    // Blend between multiple hues based on noise pattern for more complex coloring
    float noiseMix = noise3D(position * 0.04 + vec3(u_time * 0.05));
    float hueMix = mix(
        mix(hue1, hue2, 1.0 - blendFactor),
        hue3,
        smoothstep(0.4, 0.6, noiseMix) * 0.3  // Subtle influence of the third color
    );
    
    // Add significant noise variation to the hue to create subtle color streaks
    float hueDelta = fbm(position * 0.015 + vec3(u_time * 0.03)) * 0.05;
    float finalHue = mod(hueMix + hueDelta, 1.0);
    
    // Slight variation in saturation and brightness based on position
    float satVariation = noise3D(position * 0.02 + vec3(u_time * 0.07)) * 0.1;
    float briVariation = noise3D(position * 0.03 + vec3(u_time * 0.09)) * 0.1;
    
    return hsvToRGB(vec3(
        finalHue,
        u_liquidSaturation * (1.0 + satVariation),
        u_liquidBrightness * (1.0 + briVariation)
    ));
}

void main () {
    vec4 data = texture2D(u_renderingTexture, v_coordinates);
    float occlusion = texture2D(u_occlusionTexture, v_coordinates).r;

    vec3 viewSpaceNormal = vec3(data.x, data.y, sqrt(1.0 - data.x * data.x - data.y * data.y));

    float viewSpaceZ = data.a;
    vec3 viewRay = vec3(
        (v_coordinates.x * 2.0 - 1.0) * tan(u_fov / 2.0) * u_resolution.x / u_resolution.y,
        (v_coordinates.y * 2.0 - 1.0) * tan(u_fov / 2.0),
        -1.0);

    vec3 viewSpacePosition = viewRay * -viewSpaceZ;
    vec3 worldSpacePosition = vec3(u_inverseViewMatrix * vec4(viewSpacePosition, 1.0));

    float speed = data.b;
    
    // Sử dụng vị trí trong không gian để xác định màu
    vec3 color = colorByPosition(worldSpacePosition);

    vec4 lightSpacePosition = u_lightProjectionViewMatrix * vec4(worldSpacePosition, 1.0);
    lightSpacePosition /= lightSpacePosition.w;
    lightSpacePosition *= 0.5;
    lightSpacePosition += 0.5;
    vec2 lightSpaceCoordinates = lightSpacePosition.xy;
    
    float shadow = 1.0;
    const int PCF_WIDTH = 2;
    const float PCF_NORMALIZATION = float(PCF_WIDTH * 2 + 1) * float(PCF_WIDTH * 2 + 1);

    for (int xOffset = -PCF_WIDTH; xOffset <= PCF_WIDTH; ++xOffset) {
        for (int yOffset = -PCF_WIDTH; yOffset <= PCF_WIDTH; ++yOffset) {
            float shadowSample = texture2D(u_shadowDepthTexture, lightSpaceCoordinates + 5.0 * vec2(float(xOffset), float(yOffset)) / u_shadowResolution).r;
            if (lightSpacePosition.z > shadowSample + 0.001) shadow -= 1.0 / PCF_NORMALIZATION;
        }
    }


    float ambient = 1.0 - occlusion * 0.7;
    float direct = 1.0 - (1.0 - shadow) * 0.8;

    color *= ambient * direct;

    if (speed >= 0.0) {
        gl_FragColor = vec4(color, 1.0);
    } else {
        vec3 backgroundColor = vec3(1.0) - length(v_coordinates * 2.0 - 1.0) * 0.1;
        gl_FragColor = vec4(backgroundColor, 1.0);
    }

    //gl_FragColor = vec4(texture2D(u_shadowDepthTexture, v_coordinates).rrr, 1.0);
}
