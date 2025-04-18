class ColorManager {
    constructor() {
        this.colorPickers = [];
        this.container = document.getElementById('color-pickers-container');
        this.addButton = document.getElementById('add-color-button');
        this.colorWeights = []; // Lưu trữ trọng số cho từng màu
        this.onColorChangeListeners = []; // Thêm mảng lưu trữ các hàm callback
        
        // Default colors - 6 màu mặc định
        this.defaultColors = [
            '#FF4136', // Đỏ
            '#FF851B', // Cam
            '#FFDC00', // Vàng
            '#2ECC40', // Xanh lá
            '#0074D9', // Xanh dương
            '#B10DC9'  // Tím
        ];
        
        // Initialize with default colors
        this.initializeWithDefaultColors();
        
        // Add button click handler
        this.addButton.addEventListener('click', () => this.addNewColorPicker());
    }

    initializeWithDefaultColors() {
        // Xóa bất kỳ color picker hiện có
        this.colorPickers.forEach(picker => {
            if (picker && typeof picker.destroyAndRemove === 'function') {
                picker.destroyAndRemove();
            }
        });
        this.colorPickers = [];
        this.colorWeights = [];
        
        // Xóa tất cả color pickers trong container ngoại trừ color picker đầu tiên
        const firstPickerWrapper = this.container.firstChild;
        while (this.container.childNodes.length > 1) {
            this.container.removeChild(this.container.lastChild);
        }
        
        // Khởi tạo color picker đầu tiên
        const firstPicker = document.getElementById('color-picker');
        if (firstPicker) {
            const pickr = this.createPickr(firstPicker, this.defaultColors[0]);
            this.colorPickers.push(pickr);
            this.colorWeights.push(1);
        }
        
        // Thêm 5 color picker còn lại, để đạt tổng số là 6
        for (let i = 1; i < this.defaultColors.length; i++) {
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
                if (this.colorPickers.length > 6) { // Chỉ cho phép xóa nếu số lượng màu > 6
                    const index = Array.from(this.container.children).indexOf(wrapper);
                    this.colorPickers[index].destroyAndRemove();
                    this.colorPickers.splice(index, 1);
                    this.colorWeights.splice(index, 1);
                    wrapper.remove();
                    
                    // Thông báo thay đổi
                    this.notifyColorChangeListeners();
                } else {
                    console.log("Cannot remove - minimum of 6 colors required");
                    alert("Không thể xóa. Cần tối thiểu 6 màu.");
                }
            };
            wrapper.appendChild(removeButton);
            
            // Add to DOM
            this.container.appendChild(wrapper);
            
            // Create and initialize Pickr with default color
            const pickr = this.createPickr(pickerContainer, this.defaultColors[i]);
            this.colorPickers.push(pickr);
            this.colorWeights.push(1);
        }
        
        // Đảm bảo ít nhất 6 color pickers
        console.log("Initialized with " + this.colorPickers.length + " color pickers");
        
        // Kiểm tra và đảm bảo ít nhất 6 màu
        this.ensureMinimumSixColors();
        
        // Thông báo thay đổi
        this.notifyColorChangeListeners();
    }

    createPickr(element, defaultColor) {
        const pickr = Pickr.create({
            el: element,
            theme: 'nano',
            default: defaultColor || this.getDefaultColor(),
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
            if (this.colorPickers.length > 6) { // Chỉ cho phép xóa nếu số lượng màu > 6
                const index = Array.from(this.container.children).indexOf(wrapper);
                this.colorPickers[index].destroyAndRemove();
                this.colorPickers.splice(index, 1);
                this.colorWeights.splice(index, 1); // Xóa trọng số tương ứng
                wrapper.remove();
                
                // Thông báo thay đổi
                this.notifyColorChangeListeners();
            } else {
                console.log("Cannot remove - minimum of 6 colors required");
                alert("Không thể xóa. Cần tối thiểu 6 màu.");
            }
        };
        wrapper.appendChild(removeButton);
        
        // Add to DOM
        this.container.appendChild(wrapper);
        
        // Create and initialize Pickr with a default color from the list
        const colorIndex = this.colorPickers.length % this.defaultColors.length;
        const pickr = this.createPickr(pickerContainer, this.defaultColors[colorIndex]);
        this.colorPickers.push(pickr);
        this.colorWeights.push(1); // Thêm trọng số cho màu mới
        
        // Thông báo thay đổi
        this.notifyColorChangeListeners();
    }

    getDefaultColor() {
        // Lấy màu mặc định tiếp theo từ danh sách
        const index = this.colorPickers.length % this.defaultColors.length;
        return this.defaultColors[index];
    }

    // Giữ nguyên phương thức getRandomColor cho trường hợp cần dùng sau này
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

    // Phương thức để đảm bảo có ít nhất 6 màu
    ensureMinimumSixColors() {
        // Nếu thiếu màu, thêm màu cho đủ 6
        while (this.colorPickers.length < 6) {
            console.log("Adding additional color picker to reach minimum of 6 colors");
            this.addNewColorPicker();
        }
        
        console.log("Final color count: " + this.colorPickers.length);
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