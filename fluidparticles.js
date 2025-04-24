'use strict'

var FluidParticles = (function () {
    var FOV = Math.PI / 3;

    var State = {
        EDITING: 0,
        SIMULATING: 1
    };

    var GRID_WIDTH = 40,
        GRID_HEIGHT = 20,
        GRID_DEPTH = 20;

    var PARTICLES_PER_CELL = 5;

    function FluidParticles () {
        var canvas = this.canvas = document.getElementById('canvas');
        var wgl = this.wgl = new WrappedGL(canvas);

        window.wgl = wgl;

        // Set initial canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Calculate initial grid dimensions based on aspect ratio but with upper limit
        var aspectRatio = Math.min(canvas.width / canvas.height, 2.5); // Giới hạn tỷ lệ tối đa
        GRID_WIDTH = Math.min(80, Math.floor(40 * aspectRatio));
        GRID_HEIGHT = Math.min(40, Math.floor(20 * aspectRatio));
        GRID_DEPTH = Math.min(40, Math.floor(20 * aspectRatio));

        this.projectionMatrix = Utilities.makePerspectiveMatrix(new Float32Array(16), FOV, canvas.width / canvas.height, 0.1, 100.0);
        this.camera = new Camera(canvas, [GRID_WIDTH / 2, GRID_HEIGHT / 3, GRID_DEPTH / 2]);

        var boxEditorLoaded = false,
            simulatorRendererLoaded = false;

        this.boxEditor = new BoxEditor.BoxEditor(this.canvas, this.wgl, this.projectionMatrix, this.camera, [GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH], (function () {
            boxEditorLoaded = true;
            if (boxEditorLoaded && simulatorRendererLoaded) {
                start.call(this);
            }
        }).bind(this),
        (function () {
            this.redrawUI(); 
        }).bind(this));

        this.simulatorRenderer = new SimulatorRenderer(this.canvas, this.wgl, this.projectionMatrix, this.camera, [GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH], (function () {
            simulatorRendererLoaded = true;
            if (boxEditorLoaded && simulatorRendererLoaded) {
                start.call(this);
            }
        }).bind(this));

        function start(programs) {
            this.state = State.EDITING;

            this.startButton = document.getElementById('start-button');

            this.startButton.addEventListener('click', (function () {
                if (this.state === State.EDITING) {
                    this.startSimulation();
                    this.redrawUI();
                } else if (this.state === State.SIMULATING) {
                    this.stopSimulation();
                    this.redrawUI();
                }
            }).bind(this));

            this.currentPresetIndex = 0;
            this.editedSinceLastPreset = false;
            var PRESETS = [
                //dam break
                [
                    new BoxEditor.AABB([0, 0, 0], [15, 20, 20]) 
                ],

                //block drop
                [
                    new BoxEditor.AABB([0, 0, 0], [40, 7, 20]),
                    new BoxEditor.AABB([12, 12, 5], [28, 20, 15]) 
                ],

                //double splash
                [
                    new BoxEditor.AABB([0, 0, 0], [10, 20, 15]),
                    new BoxEditor.AABB([30, 0, 5], [40, 20, 20]) 
                ],
            ];
            
            // Load first preset
            var preset = PRESETS[0];
            for (var i = 0; i < preset.length; ++i) {
                this.boxEditor.boxes.push(preset[i].clone());
            }

            // Initialize parameters
            this.gridCellDensity = 0.5;
            this.timeStep = 1.0 / 60.0;
            this.particleSizeFactor = 1.2;
            this.particleCountMultiplier = 0.4;

            // Setup UI elements
            this.densitySlider = new Slider(document.getElementById('density-slider'), this.gridCellDensity, 0.2, 3.0, (function (value) {
                this.gridCellDensity = value; 
                this.redrawUI();
            }).bind(this));

            this.flipnessSlider = new Slider(document.getElementById('fluidity-slider'), this.simulatorRenderer.simulator.flipness, 0.5, 0.99, (function (value) {
                this.simulatorRenderer.simulator.flipness = value;
            }).bind(this));

            this.speedSlider = new Slider(document.getElementById('speed-slider'), this.timeStep, 0.0, 1.0 / 60.0, (function (value) {
                this.timeStep = value;
            }).bind(this));

            this.particleSizeSlider = new Slider(document.getElementById('particle-size-slider'), this.particleSizeFactor, 0.1, 3.0, (function (value) {
                this.particleSizeFactor = value;
                if (this.state === State.SIMULATING) {
                    this.updateParticleSize();
                }
            }).bind(this));

            this.particleCountSlider = new Slider(document.getElementById('particle-count-slider'), this.particleCountMultiplier, 0.1, 3.0, (function (value) {
                this.particleCountMultiplier = value;
                if (this.state === State.SIMULATING) {
                    this.restartSimulation();
                }
            }).bind(this));

            // Initialize color manager with 6 default colors
            this.colorManager = new ColorManager();
            
            // Cập nhật màu ngay khi có thay đổi
            this.updateColors = () => {
                if (this.state === State.SIMULATING) {
                    const totalColors = this.colorManager.colorPickers.length;
                    if (totalColors > 0) {
                        // Lấy tất cả các màu từ colorManager dưới dạng HSV
                        const allColors = this.colorManager.getAllColorsAsHSV();
                        
                        // Cập nhật tất cả các màu vào renderer
                        this.simulatorRenderer.renderer.updateMultipleColors(allColors);
                    }
                }
            };
            
            // Đăng ký lắng nghe sự kiện thay đổi màu
            this.colorManager.addColorChangeListener(() => {
                this.updateColors();
            });
            
            // Thêm listener khi camera di chuyển để cập nhật màu
            this.camera.addEventListener('change', () => {
                this.updateColors();
            });
            
            // Gọi lần đầu tiên
            this.updateColors();
            
            // Kiểm tra thay đổi định kỳ (dự phòng)
            setInterval(() => {
                this.updateColors();
            }, 1000);
            
            // Thêm listener khi thêm/xóa màu
            document.getElementById('add-color-button').addEventListener('click', () => {
                // Cho phép thêm màu không giới hạn
                // Đợi một chút để color picker được khởi tạo
                setTimeout(() => this.updateColors(), 100);
            });
            
            document.getElementById('color-pickers-container').addEventListener('click', (e) => {
                if (e.target.className === 'remove-color') {
                    // Đợi một chút để color picker được xóa
                    setTimeout(() => this.updateColors(), 100);
                }
            });

            this.presetButton = document.getElementById('preset-button');
            this.presetButton.addEventListener('click', (function () {
                this.editedSinceLastPreset = false;
                this.boxEditor.boxes.length = 0;
                var preset = PRESETS[this.currentPresetIndex];
                for (var i = 0; i < preset.length; ++i) {
                    this.boxEditor.boxes.push(preset[i].clone());
                }
                this.currentPresetIndex = (this.currentPresetIndex + 1) % PRESETS.length;
                if (this.state === State.SIMULATING) {
                    this.startSimulation();
                }
                this.redrawUI();
            }).bind(this));

            // Start simulation immediately
            this.startSimulation();
            this.redrawUI();

            // Setup event listeners
            canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
            canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
            document.addEventListener('mouseup', this.onMouseUp.bind(this));
            document.addEventListener('keydown', this.onKeyDown.bind(this));
            document.addEventListener('keyup', this.onKeyUp.bind(this));
            window.addEventListener('resize', this.onResize.bind(this));
            this.onResize();

            // Start update loop
            var lastTime = 0;
            var update = (function (currentTime) {
                var deltaTime = currentTime - lastTime || 0;
                lastTime = currentTime;
                this.update(deltaTime);
                requestAnimationFrame(update);
            }).bind(this);
            update();
        }
    }

    FluidParticles.prototype.onResize = function (event) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        Utilities.makePerspectiveMatrix(this.projectionMatrix, FOV, this.canvas.width / this.canvas.height, 0.1, 100.0);

        // Giới hạn kích thước grid khi resize
        var aspectRatio = Math.min(this.canvas.width / this.canvas.height, 2.5);
        GRID_WIDTH = Math.min(80, Math.floor(40 * aspectRatio));
        GRID_HEIGHT = Math.min(40, Math.floor(20 * aspectRatio));
        GRID_DEPTH = Math.min(40, Math.floor(20 * aspectRatio));

        this.wgl.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.simulatorRenderer.onResize(event);

        if (this.state === State.SIMULATING) {
            this.startSimulation();
        }
    }

    FluidParticles.prototype.onMouseMove = function (event) {
        event.preventDefault();

        if (this.state === State.EDITING) {
            this.boxEditor.onMouseMove(event);

            if (this.boxEditor.interactionState !== null) {
                this.editedSinceLastPreset = true;
            }
        } else if (this.state === State.SIMULATING) {
            this.simulatorRenderer.onMouseMove(event);
        }
    };

    FluidParticles.prototype.onMouseDown = function (event) {
        event.preventDefault();

        if (this.state === State.EDITING) {
            this.boxEditor.onMouseDown(event);
        } else if (this.state === State.SIMULATING) {
            this.simulatorRenderer.onMouseDown(event);
        }
    };

    FluidParticles.prototype.onMouseUp = function (event) {
        event.preventDefault();

        if (this.state === State.EDITING) {
            this.boxEditor.onMouseUp(event);
        } else if (this.state === State.SIMULATING) {
            this.simulatorRenderer.onMouseUp(event);
        }
    };

    FluidParticles.prototype.onKeyDown = function (event) {
        if (this.state === State.EDITING) {
            this.boxEditor.onKeyDown(event);
        }
    };

    FluidParticles.prototype.onKeyUp = function (event) {
        if (this.state === State.EDITING) {
            this.boxEditor.onKeyUp(event);
        }
    };

    //the UI elements are all created in the constructor, this just updates the DOM elements
    //should be called every time state changes
    FluidParticles.prototype.redrawUI = function () {

        var simulatingElements = document.querySelectorAll('.simulating-ui');
        var editingElements = document.querySelectorAll('.editing-ui');


        if (this.state === State.SIMULATING) {
            for (var i = 0; i < simulatingElements.length; ++i) {
                simulatingElements[i].style.display = 'block';
            }

            for (var i = 0; i < editingElements.length; ++i) {
                editingElements[i].style.display = 'none';
            }


            this.startButton.textContent = 'Edit';
            this.startButton.className = 'start-button-active';
        } else if (this.state === State.EDITING) {
            for (var i = 0; i < simulatingElements.length; ++i) {
                simulatingElements[i].style.display = 'none';
            }

            for (var i = 0; i < editingElements.length; ++i) {
                editingElements[i].style.display = 'block';
            }

            document.getElementById('particle-count').innerHTML = this.getParticleCount().toFixed(0) + ' particles';

            if (this.boxEditor.boxes.length >= 2 ||
                this.boxEditor.boxes.length === 1 && (this.boxEditor.interactionState === null || this.boxEditor.interactionState.mode !== BoxEditor.InteractionMode.EXTRUDING && this.boxEditor.interactionState.mode !== BoxEditor.InteractionMode.DRAWING)) { 
                this.startButton.className = 'start-button-active';
            } else {
                this.startButton.className = 'start-button-inactive';
            }

            this.startButton.textContent = 'Start';

            if (this.editedSinceLastPreset) {
                this.presetButton.innerHTML = 'Use Preset';
            } else {
                this.presetButton.innerHTML = 'Next Preset';
            }
        }

        this.flipnessSlider.redraw();
        this.densitySlider.redraw();
        this.speedSlider.redraw();
        this.particleSizeSlider.redraw();
        this.particleCountSlider.redraw();
        
        // Remove color slider redraws
    }


    //compute the number of particles for the current boxes and grid density
    FluidParticles.prototype.getParticleCount = function () {
        var boxEditor = this.boxEditor;
        var gridCells = GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH * this.gridCellDensity;

        var gridResolutionY = Math.ceil(Math.pow(gridCells / 2, 1.0 / 3.0));
        var gridResolutionZ = gridResolutionY;
        var gridResolutionX = gridResolutionY * 2;

        var totalGridCells = gridResolutionX * gridResolutionY * gridResolutionZ;

        var totalVolume = 0;
        for (var i = 0; i < boxEditor.boxes.length; ++i) {
            var box = boxEditor.boxes[i];
            var volume = box.computeVolume();
            totalVolume += volume;
        }

        var fractionFilled = totalVolume / (GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH);
        
        // Điều chỉnh hệ số nhân để đạt 80% khi max
        var baseMultiplier = Math.min(1.5, Math.max(1.0, (GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH) / (40 * 20 * 20)));
        var targetFillRatio = 0.8; // Tăng lên 80%
        var maxMultiplier = targetFillRatio / fractionFilled;
        var adjustedMultiplier = this.particleCountMultiplier * maxMultiplier / 3.0;

        var desiredParticleCount = fractionFilled * totalGridCells * PARTICLES_PER_CELL * baseMultiplier * adjustedMultiplier;

        return Math.floor(desiredParticleCount);
    }

    //begin simulation using boxes from box editor
    //EDITING -> SIMULATING
    FluidParticles.prototype.startSimulation = function () {
        this.state = State.SIMULATING;

        var desiredParticleCount = this.getParticleCount();
        
        var particlesWidth = Math.min(768, Math.max(512, Math.pow(2, Math.ceil(Math.log2(Math.sqrt(desiredParticleCount))))));
        var particlesHeight = Math.ceil(desiredParticleCount / particlesWidth);

        var particleCount = particlesWidth * particlesHeight;
        var particlePositions = [];
        
        var boxEditor = this.boxEditor;
        
        // Sắp xếp các box theo độ cao (y) tăng dần
        var sortedBoxes = boxEditor.boxes.slice().sort(function(a, b) {
            return a.min[1] - b.min[1]; // So sánh theo tọa độ y
        });

        var totalVolume = 0;
        for (var i = 0; i < sortedBoxes.length; ++i) {
            totalVolume += sortedBoxes[i].computeVolume();
        }

        var particlesCreatedSoFar = 0;
        
        // Tạo hạt từ box thấp nhất lên cao nhất
        for (var i = 0; i < sortedBoxes.length; ++i) {
            var box = sortedBoxes[i];
            var particlesInBox = 0;
            
            if (i < sortedBoxes.length - 1) {
                particlesInBox = Math.floor(particleCount * box.computeVolume() / totalVolume);
            } else {
                particlesInBox = particleCount - particlesCreatedSoFar;
            }

            // Phân bố hạt tập trung ở đáy của mỗi box
            for (var j = 0; j < particlesInBox; ++j) {
                var position = box.randomPoint();
                
                // Điều chỉnh vị trí y để hạt tập trung nhiều hơn ở phần dưới
                var heightFactor = Math.pow(Math.random(), 2); // Phân bố theo hàm mũ
                position[1] = box.min[1] + (box.max[1] - box.min[1]) * heightFactor;
                
                particlePositions.push(position);
            }

            particlesCreatedSoFar += particlesInBox;
        }

        var gridCells = GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH * this.gridCellDensity;
        var gridResolutionY = Math.ceil(Math.pow(gridCells / 2, 1.0 / 3.0));
        var gridResolutionZ = gridResolutionY;
        var gridResolutionX = gridResolutionY * 2;

        var gridSize = [GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH];
        var gridResolution = [gridResolutionX, gridResolutionY, gridResolutionZ];

        var sphereRadius = (9.0 * this.particleSizeFactor) / gridResolutionX;
        this.simulatorRenderer.reset(particlesWidth, particlesHeight, particlePositions, gridSize, gridResolution, PARTICLES_PER_CELL, sphereRadius);

        this.camera.setBounds(0, Math.PI / 2);
        
        // Đảm bảo màu sắc mặc định được áp dụng ngay từ đầu
        // Tăng thời gian đợi để đảm bảo tất cả 6 màu được tạo trước khi cập nhật
        setTimeout(() => {
            console.log("Applying colors to simulation...");
            this.updateColors();
        }, 100);
    }

    //go back to box editing
    //SIMULATING -> EDITING
    FluidParticles.prototype.stopSimulation = function () {
        this.state = State.EDITING;

        this.camera.setBounds(-Math.PI / 4, Math.PI / 4);
    }

    FluidParticles.prototype.update = function () {
        if (this.state === State.EDITING) {
            this.boxEditor.draw();
        } else if (this.state === State.SIMULATING) {
            this.simulatorRenderer.update(this.timeStep);
        }
    }

    FluidParticles.prototype.updateParticleSize = function () {
        var gridCells = GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH * this.gridCellDensity;
        var gridResolutionY = Math.ceil(Math.pow(gridCells / 2, 1.0 / 3.0));
        var gridResolutionX = gridResolutionY * 2;
        var sphereRadius = (7.0 * this.particleSizeFactor) / gridResolutionX;
        this.simulatorRenderer.renderer.sphereRadius = sphereRadius;
    };

    FluidParticles.prototype.restartSimulation = function () {
        if (this.state === State.SIMULATING) {
            this.startSimulation(); // Restart simulation with new particle count
        }
    };

    return FluidParticles;
}());

