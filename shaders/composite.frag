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

// Fractal Brownian Motion
float fbm(vec3 position) {
    // Use position for interesting variation
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 3.0;
    
    // Add several layers of noise
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise2D(vec2(position.x, position.y) * frequency + u_time * 0.1);
        value += amplitude * noise2D(vec2(position.y, position.z) * frequency + u_time * 0.12);
        value += amplitude * noise2D(vec2(position.z, position.x) * frequency + u_time * 0.14);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// 3D Noise function
float noise3D(vec3 p) {
    return 0.5 + 0.5 * sin(p.x * 7.0 + u_time * 0.3) * 
                    cos(p.y * 7.0 + u_time * 0.2) * 
                    sin(p.z * 7.0 + u_time * 0.1);
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
    
    // Tạo chuyển động cho các trung tâm màu
    for (int i = 0; i < 8; i++) {
        float speed = 0.2 + float(i) * 0.03;
        float radius = 6.0 + float(i);
        float angle = u_time * speed + float(i) * 0.8;
        
        // Tọa độ cơ sở cho mỗi trung tâm
        vec3 baseCenter = vec3(
            15.0 + float(i) * 2.0,
            10.0,
            10.0
        );
        
        // Chuyển động xoay quanh tọa độ cơ sở
        centers[i] = baseCenter + vec3(
            sin(angle) * radius,
            cos(angle * 0.7) * radius * 0.5,
            sin(angle * 1.3) * radius * 0.7
        );
    }
    
    // Hệ số nhiễu cho mỗi màu
    float noiseFactors[8];
    for (int i = 0; i < 8; i++) {
        noiseFactors[i] = 2.5 + float(i) * 0.2;
    }
    
    // Tìm hai điểm trung tâm gần nhất
    float minDist = 1000.0;
    float colorIndex = 0.0;
    float secondMinDist = 1000.0;
    float secondColorIndex = 0.0;
    
    for (int i = 0; i < 8; i++) {
        if (float(i) >= colorCount) break;
        
        // Tạo hình dạng không đều cho vùng màu
        vec3 weights = vec3(
            1.0 + sin(u_time * 0.3 + float(i)) * 0.2,
            1.1 + cos(u_time * 0.4 + float(i) * 1.3) * 0.2,
            0.9 + sin(u_time * 0.5 + float(i) * 0.7) * 0.2
        );
        
        // Tính khoảng cách đến điểm trung tâm với trọng số
        float dist = length((position - centers[i]) * weights);
        
        // Thêm nhiễu cho ranh giới không đều
        float noiseFactor = noiseFactors[i];
        float timeOffset = u_time * 0.2 + float(i) * 0.5;
        
        // Tạo ranh giới động và phức tạp
        dist += sin(position.x * 0.3 + timeOffset) * noiseFactor;
        dist += cos(position.y * 0.4 + timeOffset * 0.8) * noiseFactor;
        dist += sin(position.z * 0.5 + timeOffset * 1.2) * noiseFactor;
        
        // Thêm nhiễu phức tạp hơn
        dist += noise3D(position * 0.1 + vec3(u_time * 0.15) + vec3(float(i))) * noiseFactor;
        
        // Thêm FBM cho các vùng màu phức tạp và tự nhiên
        dist += fbm(position * 0.05 + vec3(u_time * 0.1 + float(i))) * noiseFactor * 2.0;
        
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
    
    // Tính trọng số pha trộn giữa 2 màu gần nhất
    float blendFactor = smoothstep(0.0, 4.0 + sin(u_time) * 2.0, secondMinDist - minDist);
    
    // Lấy hue từ danh sách màu
    float hue1 = getHueByIndex(colorIndex);
    float hue2 = getHueByIndex(secondColorIndex);
    
    // Pha trộn 2 hue - tạo gradient ở biên
    float hue = mix(hue1, hue2, 1.0 - blendFactor);
    
    // Thêm nhiễu vào hue
    float hueDelta = fbm(position * 0.01 + vec3(u_time * 0.05)) * 0.02;
    hue = mod(hue + hueDelta, 1.0);
    
    return hsvToRGB(vec3(
        hue,
        u_liquidSaturation,
        u_liquidBrightness
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
