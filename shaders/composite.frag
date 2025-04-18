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

// Hàm tạo nhiễu ngẫu nhiên
float noise(vec3 p) {
    // Hàm nhiễu đơn giản dựa trên sin/cos
    return 0.5 + 0.5 * sin(p.x * 7.0) * cos(p.y * 7.0) * sin(p.z * 7.0);
}

// Tạo màu dựa trên vị trí và màu từ danh sách
vec3 colorByPosition(vec3 position) {
    // Thay đổi cách phân chia không gian để tạo ra hiệu ứng màu tự nhiên hơn
    // Sử dụng khoảng cách từ điểm trung tâm và thêm nhiễu Perlin để tạo ranh giới tự nhiên hơn
    
    // Tạo một số điểm trung tâm ảo cho mỗi màu - phân bố đều hơn trong không gian
    vec3 centers[8];
    centers[0] = vec3(10.0, 5.0, 5.0);   // Điểm trung tâm màu 1
    centers[1] = vec3(28.0, 7.0, 13.0);  // Điểm trung tâm màu 2
    centers[2] = vec3(18.0, 13.0, 8.0);  // Điểm trung tâm màu 3
    centers[3] = vec3(7.0, 10.0, 17.0);  // Điểm trung tâm màu 4
    centers[4] = vec3(22.0, 5.0, 5.0);   // Điểm trung tâm màu 5
    centers[5] = vec3(15.0, 15.0, 15.0); // Điểm trung tâm màu 6 - điều chỉnh
    centers[6] = vec3(32.0, 12.0, 8.0);  // Điểm trung tâm màu 7 - điều chỉnh
    centers[7] = vec3(5.0, 12.0, 3.0);   // Điểm trung tâm màu 8 - điều chỉnh
    
    // Số lượng màu thực tế có sẵn
    float colorCount = max(1.0, min(8.0, u_colorCount));
    
    // Định nghĩa hàm nhiễu cho mỗi màu để tạo ranh giới tự nhiên hơn
    float noiseFactors[8];
    noiseFactors[0] = 2.5;
    noiseFactors[1] = 2.7;
    noiseFactors[2] = 2.9;
    noiseFactors[3] = 3.1;
    noiseFactors[4] = 2.8;
    noiseFactors[5] = 3.3; // Tăng nhiễu cho màu 6
    noiseFactors[6] = 3.5; // Tăng nhiễu cho màu 7
    noiseFactors[7] = 3.7; // Tăng nhiễu cho màu 8
    
    // Tính toán khoảng cách đến mỗi điểm trung tâm
    float minDist = 1000.0;
    float colorIndex = 0.0;
    float secondMinDist = 1000.0;
    float secondColorIndex = 0.0;
    
    // Tìm hai điểm trung tâm gần nhất
    for (int i = 0; i < 8; i++) {
        if (float(i) >= colorCount) break;
        
        // Trọng số riêng cho mỗi trục - làm cho hình dạng vùng màu không đều
        vec3 weights = vec3(1.0, 1.2 + float(i) * 0.05, 1.1 - float(i) * 0.03);
        
        // Sử dụng vecto khác nhau cho mỗi điểm trung tâm
        float dist = length((position - centers[i]) * weights);
        
        // Thêm nhiễu cho ranh giới
        float noiseFactor = noiseFactors[i];
        dist += sin(position.x * 0.3 + float(i) * 0.1) * noiseFactor;
        dist += cos(position.y * 0.4 + float(i) * 0.2) * noiseFactor;
        dist += sin(position.z * 0.5 + float(i) * 0.3) * noiseFactor;
        
        // Thêm nhiễu dựa trên vị trí và chỉ số màu
        dist += noise(position * (0.05 + float(i) * 0.01)) * noiseFactor;
        
        // Lưu 2 khoảng cách nhỏ nhất để pha trộn ở biên
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
    
    // Tính toán trọng số pha trộn giữa 2 màu gần nhất
    float blendFactor = smoothstep(0.0, 8.0, secondMinDist - minDist);
    
    // Lấy hue từ danh sách màu
    float hue1 = getHueByIndex(colorIndex);
    float hue2 = getHueByIndex(secondColorIndex);
    
    // Pha trộn 2 hue - tạo gradient ở biên
    float hue = mix(hue1, hue2, 1.0 - blendFactor);
    
    // Thêm nhiễu nhỏ vào hue để tạo biến thể màu tinh tế
    float hueDelta = sin(position.x * 0.5) * 0.01 + 
                    cos(position.y * 0.4) * 0.01 + 
                    sin(position.z * 0.3) * 0.01;
    
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
