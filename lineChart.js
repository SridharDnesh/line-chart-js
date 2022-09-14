//We are setting strokeStyle here, so we use ctx.save() and ctx.restore()
// to avoid modifying the color outside this funtion
function drawLine(ctx, startX, startY, endX, endY, color, type) {
    if (!ctx) return;
    ctx.save(); //Saves the state of the current context
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    if (type === "dotted") {
      ctx.setLineDash([2, 3]);
    }
    ctx.beginPath(); //This informs the drawing context that we are starting to draw something new on the canvas
    ctx.moveTo(startX, startY); // to set the starting point
    ctx.lineTo(endX, endY); //to indicate the end point
    ctx.stroke(); // do the actual drawing
    ctx.restore(); //Returns previously saved path state and attributes
  }
  
  function drawArc(ctx, startX, startY, radius, color) {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(startX, startY, radius, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.restore();
  }
  
  function drawText(ctx, text, x, y, font, align) {
    if (!ctx) return;
    ctx.save();
    ctx.textAlign = align ?? "start";
    ctx.fillStyle = font.color;
    // this.ctx.textBaseline = "center";
    ctx.font = `${font.weight} ${font.size}px ${font.family}`;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  
  // Extracts the maximum value of the values from our data object and stores it in the maxValue property
  function getMaxValue(data, labelToCompare) {
    let allValues = [];
    //getting all the labelToCompare values
    Object.values(data).map((arrayOfValues) => {
      arrayOfValues.forEach((object) => {
        allValues.push(object[labelToCompare]);
      });
    });
    const maxValue = Math.max(...allValues);
    return maxValue;
  }
  
  class LineChart {
    constructor(options) {
      this.options = options;
      this.canvas = options.canvas;
      this.stickyAxisCanvas = options.stickyAxisCanvas;
      this.cw = options.cw;
      this.ch = options.ch;
      this.stickycw = options.stickycw;
      this.stickych = options.stickych;
      this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
      this.stickyCtx = this.stickyAxisCanvas
        ? this.stickyAxisCanvas.getContext("2d")
        : null;
      this.colors = options.colors;
      this.paddingX = options.paddingX;
      this.paddingY = options.paddingY;
      this.XAxis = options.XAxis;
      this.YAxis = options.YAxis;
      this.colors = options.colors;
      this.data = options.data;
      this.stickyLabel = options.stickyLabel;
      this.dataLabel = options.dataLabel;
      this.dataColor = options.dataColor;
      this.YAxislabel = options.YAxislabel;
      this.arcRadius = options.arcRadius;
      this.maxYValue = getMaxValue(this.data, "y");
      this.maxXValue = getMaxValue(this.data, "x");
      this.canvasActualWidth = null;
      this.canvasActualHeight = null;
      this.handleMouseOver = this.handleMouseOver.bind(this);
      this.handleScroll = this.handleScroll.bind(this);
      if (this.canvas) {
        this.canvas.addEventListener("mousemove", this.handleMouseOver);
      }
      this.dataPoints = []; //storing all the given data values with x & y position
      this.matchedPoints = []; // storing the match datapoint while hover
      this.initChart();
      this.sticky = false;
    }
  
    initChart() {
      if (!this.canvas) return;
      if (!this.stickyAxisCanvas) return;
      this.canvas.width = this.cw;
      this.canvas.height = this.ch;
      this.stickyAxisCanvas.width = this.stickycw;
      this.stickyAxisCanvas.height = this.stickych;
      this.canvasActualWidth = this.findCanvasActualWidth(
        this.cw,
        this.paddingX,
        this.YAxis?.stepFont?.size ?? 0,
        this.YAxis?.stepFont?.rightSpacing ?? 0
      );
      this.canvasActualHeight = this.findCanvasActualHeight(
        this.ch,
        this.paddingY,
        this.XAxis?.stepFont?.size ?? 0,
        this.XAxis?.stepFont?.topSpacing ?? 0,
        this.YAxislabel?.font?.size ?? 0,
        this.YAxislabel?.font?.bottomSpacing ?? 0
      );
      let canvasContainer = document.getElementById("canvasContainer");
      canvasContainer.addEventListener("wheel", this.handleScroll);
    }
  
    findCanvasActualWidth(canvasWidth, padding, stepFontSize, stepRightSpacing) {
      let canvasActualWidth =
        canvasWidth - (padding * 2 + stepFontSize + stepRightSpacing);
  
      return canvasActualWidth;
    }
  
    findCanvasActualHeight(
      canvasHeight,
      padding,
      stepFontSize,
      stepTopSpacing,
      labelFontSize,
      labelBottomSpacing
    ) {
      let canvasActualHeight =
        canvasHeight -
        (padding * 2 +
          // (stepFontSize + stepTopSpacing) +
          (labelFontSize + labelBottomSpacing));
  
      return canvasActualHeight;
    }
  
    findEndYValueWithMax(
      actualHeight,
      gridValue,
      maxValue,
      stepValue,
      padding,
      stepFontSize,
      stepTopSpacing,
      labelFontSize,
      labelBottomSpacing,
      extraStep
    ) {
      let endYValue =
        actualHeight * (1 - gridValue / (maxValue + stepValue * extraStep - 5)) +
        (padding +
          stepFontSize +
          stepTopSpacing +
          labelFontSize +
          labelBottomSpacing);
      return endYValue;
    }
  
    handleScroll(evt) {
      evt.preventDefault();
      console.log(evt);
      let yAxisStickyContainer = document.getElementById("yAxisSticky");
      console.log(evt.deltaY, canvasContainer.scrollLeft, "canvasContainer");
      if (evt.deltaY < 0) {
        canvasContainer.scrollLeft += evt.deltaY;
        if (canvasContainer.scrollLeft < this.stickycw) {
          this.stickyCtx.clearRect(0, 0, this.stickycw, this.stickych);
          yAxisStickyContainer.style.display = "none";
          this.sticky = false;
        }
      } else if (evt.deltaY > 0) {
        canvasContainer.scrollLeft += evt.deltaY;
        if (!this.sticky) {
          this.drawStickyAxis();
        }
        this.sticky = true;
        yAxisStickyContainer.style.display = "block";
      }
    }
  
    handleMouseOver(evt) {
      //clear the previously saved matched points
      this.matchedPoints = [];
      //get the x cordinate of the canvas
      const XPoint = evt.offsetX;
      //clear the canvas fully when we started to hover the mouse
      this.ctx.clearRect(0, 0, this.cw, this.ch);
  
      //find the matched data point with matched cursor xpoint +-2
      this.dataPoints.forEach((dataPoint) => {
        if (dataPoint.startX === XPoint) {
          this.matchedPoints = [...this.matchedPoints, dataPoint];
        } else if (dataPoint.startX - 1 === XPoint) {
          this.matchedPoints = [...this.matchedPoints, dataPoint];
        } else if (dataPoint.startX + 1 === XPoint) {
          this.matchedPoints = [...this.matchedPoints, dataPoint];
        } else if (dataPoint.startX - 2 === XPoint) {
          this.matchedPoints = [...this.matchedPoints, dataPoint];
        } else if (dataPoint.startX + 2 === XPoint) {
          this.matchedPoints = [...this.matchedPoints, dataPoint];
        }
      });
      //now redraw the chart with data & matched points
      this.drawGridLines();
      this.drawLines();
    }
  
    drawGridLines() {
      if (!this.maxXValue && !this.maxYValue) {
        return;
      }
      this.drawYAxis();
      this.drawXAxis();
    }
  
    drawStickyAxis() {
      var gridValue = 0;
      while (gridValue <= this.maxYValue + this.YAxis.step) {
        var endY = this.findEndYValueWithMax(
          this.canvasActualHeight,
          gridValue,
          this.maxYValue,
          this.YAxis?.step,
          this.paddingY,
          this.maxXValue ? this.XAxis?.stepFont?.size : 0,
          this.maxXValue ? this.XAxis?.stepFont?.topSpacing : 0,
          this.YAxislabel?.font?.size ?? 0,
          this.YAxislabel?.font?.bottomSpacing ?? 0,
          2
        );
        // draw the step values
        drawText(
          this.stickyCtx,
          gridValue,
          this.paddingX,
          endY,
          this.XAxis.stepFont,
          "right"
        );
        gridValue += this.YAxis.step;
      }
  
      // draw the ylabel name
      // drawText(
      //   this.stickyCtx,
      //   this.stickyLabel,
      //   this.paddingX,
      //   this.paddingY + 8,
      //   this.YAxislabel.font
      // );
    }
  
    drawXAxis() {
      var gridValue = 0;
  
      //this will execute if the y has values
      if (this.maxYValue) {
        while (gridValue <= this.maxYValue + this.YAxis.step) {
          var endY = this.findEndYValueWithMax(
            this.canvasActualHeight,
            gridValue,
            this.maxYValue,
            this.YAxis?.step,
            this.paddingY,
            this.maxXValue ? this.XAxis?.stepFont?.size : 0,
            this.maxXValue ? this.XAxis?.stepFont?.topSpacing : 0,
            this.YAxislabel?.font?.size ?? 0,
            this.YAxislabel?.font?.bottomSpacing ?? 0,
            2
          );
  
          let startX =
            this.paddingX +
            (this.YAxis?.stepFont?.size ?? 0) +
            (this.YAxis?.stepFont?.rightSpacing ?? 0);
  
          let endX = this.cw - this.paddingX;
  
          drawLine(
            this.ctx,
            startX,
            endY,
            endX,
            endY,
            this.XAxis.color,
            this.XAxis.lineType
          );
  
          // draw the step values
          drawText(
            this.ctx,
            gridValue,
            this.paddingX,
            endY,
            this.XAxis.stepFont,
            "right"
          );
          gridValue += this.YAxis.step;
        }
      }
    }
  
    drawYAxis() {
      if (!this.maxXValue) {
        this.ctx.globalCompositeOperation = "destination-over";
        var numberOfLines = this.options.data.line1.length;
        var lineSpacing = Math.round(this.canvasActualWidth / numberOfLines);
  
        console.log(lineSpacing, "lineSpacing", numberOfLines, "numberOfLines");
  
        for (let index = 0; index < numberOfLines; index++) {
          let startX =
            this.paddingX +
            (this.YAxis?.stepFont?.size ?? 0) +
            (this.YAxis?.stepFont?.rightSpacing ?? 0) +
            lineSpacing * index;
  
          let startY =
            this.paddingY +
            (this.YAxislabel?.font?.size ?? 0) +
            (this.YAxislabel?.font?.bottomSpacing ?? 0);
  
          let endY =
            this.ch -
            this.paddingY +
            (this.maxXValue
              ? (this.XAxis?.stepFont?.size ?? 0) +
                (this.XAxis?.stepFont?.topSpacing ?? 0)
              : 0);
  
          if (
            this.matchedPoints.some(
              (point) => point.startX === startX && point.startY === point.startY
            )
          ) {
            drawLine(
              this.ctx,
              startX,
              startY,
              startX,
              endY,
              this.YAxis.hoverColor
            );
          } else {
            drawLine(this.ctx, startX, startY, startX, endY, this.YAxis.color);
          }
          // this.ctx.globalCompositeOperation = "source-over";
  
          // draw the label values
          drawText(
            this.ctx,
            this.options.data.line1[index].label,
            startX - 5,
            this.paddingY + 8,
            this.YAxislabel.font
          );
        }
      }
    }
  
    drawLines() {
      this.ctx.globalCompositeOperation = "source-over";
      let values = Object.values(this.data);
      var numberOfLines = this.options.data.line1.length;
      var lineSpacing = Math.round(this.canvasActualWidth / numberOfLines);
  
      values.map((data, parentIndex) => {
        data.forEach((value, index) => {
          let startX =
            this.paddingX +
            (this.YAxis?.stepFont?.size ?? 0) +
            (this.YAxis?.stepFont?.rightSpacing ?? 0) +
            lineSpacing * index;
  
          let endX =
            this.paddingX +
            (this.YAxis?.stepFont?.size ?? 0) +
            (this.YAxis?.stepFont?.rightSpacing ?? 0) +
            lineSpacing * (index + 1);
  
          let lineHeight1 = Math.round(
            (this.canvasActualHeight * value.y) /
              (this.maxYValue + this.YAxis.step * 2 - 5)
          );
          let lineHeight2 = Math.round(
            (this.canvasActualHeight * data[index + 1]?.y) /
              (this.maxYValue + this.YAxis.step * 2 - 5)
          );
  
          let startY = this.ch - lineHeight1 - this.paddingY;
          let endY = this.ch - lineHeight2 - this.paddingY;
  
          let newDataPoint = {
            value: value.y,
            startX,
            startY,
          };
  
          let checkForDuplicateDataPoint = this.dataPoints.some(
            (dataPoint) =>
              dataPoint.startX === newDataPoint.startX &&
              dataPoint.startY === newDataPoint.startY &&
              dataPoint.value === newDataPoint.value
          );
  
          if (!checkForDuplicateDataPoint) {
            this.dataPoints = [...this.dataPoints, newDataPoint];
          }
          drawLine(
            this.ctx,
            startX,
            startY,
            endX,
            endY,
            this.dataColor[parentIndex]
          );
          //draw the arc only if this datapoint is present in matchedpoint
          if (
            this.matchedPoints.some(
              (point) => point.startX === startX && point.startY === point.startY
            )
          ) {
            drawArc(
              this.ctx,
              startX,
              startY,
              this.arcRadius,
              this.dataColor[parentIndex]
            );
            this.ctx.globalCompositeOperation = "source-over";
            // draw the label values
            drawText(
              this.ctx,
              `${value.y} ${this.dataLabel[parentIndex].label}`,
              startX + 8,
              startY + 4,
              this.dataLabel[parentIndex].font
            );
          }
        });
      });
    }
  
    draw() {
      if (!this.ctx) return;
      this.drawGridLines();
      this.drawLines();
    }
  }
  