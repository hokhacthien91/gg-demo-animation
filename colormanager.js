class ColorManager {
    constructor() {
        this.colorPickers = [];
        this.container = document.getElementById('color-pickers-container');
        this.addButton = document.getElementById('add-color-button');
        this.colorWeights = []; // Lưu trữ trọng số cho từng màu
        this.onColorChangeListeners = []; // Thêm mảng lưu trữ các hàm callback
        
        // Initialize first color picker
        this.initializeFirstPicker();
        
        // Add button click handler
        this.addButton.addEventListener('click', () => this.addNewColorPicker());
    }

    initializeFirstPicker() {
        const firstPicker = document.getElementById('color-picker');
        const pickr = this.createPickr(firstPicker);
        this.colorPickers.push(pickr);
        this.colorWeights.push(Math.random()); // Thêm trọng số cho màu đầu tiên
    }

    createPickr(element) {
        const pickr = Pickr.create({
            el: element,
            theme: 'nano',
            default: this.getRandomColor(),
            components: {
                preview: true,
                opacity: true,
                hue: true,
                interaction: {
                    input: true,
                    save: true
                }
            }
        });
        
        // Thêm sự kiện thay đổi màu
        pickr.on('change', (color) => {
            // Thông báo cho tất cả listeners khi có thay đổi màu
            this.notifyColorChangeListeners();
        });
        
        return pickr;
    }
    
    // Thêm phương thức đăng ký lắng nghe thay đổi màu
    addColorChangeListener(callback) {
        if (typeof callback === 'function') {
            this.onColorChangeListeners.push(callback);
        }
    }
    
    // Thêm phương thức thông báo cho tất cả listeners
    notifyColorChangeListeners() {
        this.onColorChangeListeners.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in color change listener:', error);
            }
        });
    }

    addNewColorPicker() {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'color-picker-wrapper';
        
        // Create color picker container
        const pickerContainer = document.createElement('div');
        wrapper.appendChild(pickerContainer);
        
        // Create remove button
        const removeButton = document.createElement('div');
        removeButton.className = 'remove-color';
        removeButton.innerHTML = '×';
        removeButton.onclick = () => {
            if (this.colorPickers.length > 1) {
                const index = Array.from(this.container.children).indexOf(wrapper);
                this.colorPickers[index].destroyAndRemove();
                this.colorPickers.splice(index, 1);
                this.colorWeights.splice(index, 1); // Xóa trọng số tương ứng
                wrapper.remove();
                
                // Thông báo thay đổi
                this.notifyColorChangeListeners();
            }
        };
        wrapper.appendChild(removeButton);
        
        // Add to DOM
        this.container.appendChild(wrapper);
        
        // Create and initialize Pickr
        const pickr = this.createPickr(pickerContainer);
        this.colorPickers.push(pickr);
        this.colorWeights.push(Math.random()); // Thêm trọng số cho màu mới
        
        // Thông báo thay đổi
        this.notifyColorChangeListeners();
    }

    getRandomColor() {
        const hue = Math.random() * 360;
        const saturation = 0.7 + Math.random() * 0.3; // 70-100%
        const value = 0.8 + Math.random() * 0.2; // 80-100%
        
        // Convert HSV to RGB
        const c = value * saturation;
        const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
        const m = value - c;
        
        let r, g, b;
        if (hue < 60) { r = c; g = x; b = 0; }
        else if (hue < 120) { r = x; g = c; b = 0; }
        else if (hue < 180) { r = 0; g = c; b = x; }
        else if (hue < 240) { r = 0; g = x; b = c; }
        else if (hue < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        
        return `rgb(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)})`;
    }

    // Get color for fluid simulation based on position or index
    getBlendedColor(index = 0) {
        if (this.colorPickers.length === 0) return { r: 0, g: 0, b: 0, a: 1 };
        
        // Sử dụng index để chọn màu từ danh sách, quay vòng nếu index vượt quá số lượng màu
        const colorIndex = index % this.colorPickers.length;
        const color = this.colorPickers[colorIndex].getColor().toRGBA();
        
        return { 
            r: color[0]/255, 
            g: color[1]/255, 
            b: color[2]/255, 
            a: color[3] 
        };
    }
    
    // Mới: Lấy tất cả màu dưới dạng mảng HSV
    getAllColorsAsHSV() {
        if (this.colorPickers.length === 0) {
            return [{ h: 0, s: 0.8, v: 0.9 }]; // Mặc định nếu không có màu nào
        }
        
        const hsvColors = [];
        
        for (let i = 0; i < this.colorPickers.length; i++) {
            // Lấy màu trực tiếp từ color picker
            const color = this.colorPickers[i].getColor().toRGBA();
            const r = color[0]/255;
            const g = color[1]/255;
            const b = color[2]/255;
            
            // Chuyển đổi RGB sang HSV
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const d = max - min;
            
            let h = 0;
            if (d !== 0) {
                if (max === r) {
                    h = (g - b) / d + (g < b ? 6 : 0);
                } else if (max === g) {
                    h = (b - r) / d + 2;
                } else {
                    h = (r - g) / d + 4;
                }
                h /= 6;
            }
            
            const s = max === 0 ? 0 : d / max;
            const v = max;
            
            hsvColors.push({ h, s, v });
        }
        
        return hsvColors;
    }
} 