
import React from 'react';
import {
  AppRegistry, Image, ScrollView, StyleSheet, TextInput, View,
  TouchableOpacity, Text, Alert, PanResponder, Dimensions, Keyboard
} from 'react-native';
import { Icon } from 'react-native-elements'
import RNSketchCanvas from './modified_canvas/index';
import LinearGradient from 'react-native-linear-gradient';
import * as RNFS from 'react-native-fs';
//import RNReadWriteExif from 'react-native-read-write-exif';
import Share from 'react-native-share';
import DoQueue from './do-queue';

import { getSquareButton, colors, getImageDimensions } from './elements'
import rnTextSize from 'react-native-text-size'

const topLayer = 51 + 8 + 8;
const maxZoom = 3;
const marginTop = 4;
const TOP = 0, RIGHT = 1, BOTTOM = 2, LEFT = 3;
const DEFAULT_STROKE_WIDTH = 5;
const INITIAL_TEXT_SIZE = 80;

async function measureText(fontSize, txt) {
  return rnTextSize.measure({
    text: txt,             // text to measure, can include symbols
    width: 1000,            // max-width of the "virtual" container
    fontFamily: undefined,
    fontSize: fontSize,
    fontStyle: 'normal',
    fontWeight: 'normal'
  })
}

export default class IssieEditPhoto extends React.Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'עריכת דף',
      headerStyle: {
        backgroundColor: '#8EAFCE',
      },
      headerTintColor: 'white',
      headerTitleStyle: {
        fontSize: 30,
        fontWeight: 'bold'
      },
    };
  }

  constructor() {
    super();

    this.Load = this.Load.bind(this);

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => this._shouldDragText(evt, gestureState),
      onStartShouldSetPanResponderCapture: (evt, gestureState) => this._shouldDragText(evt, gestureState),
      onMoveShouldSetPanResponder: (evt, gestureState) => this._shouldDragText(evt, gestureState),
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => this._shouldDragText(evt, gestureState),
      onPanResponderMove: (evt, gestureState) => {
        if (this.state.textMode) {
          this.setState({
            xText: this.s2aW(gestureState.moveX), yText: this.s2aH(gestureState.moveY)
          });
        }
      },
      onPanResponderRelease: () => {
        if (this.state.textMode) this.SaveText();
      }
    });

    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);

    this.state = {
      color: colors.black,
      fontSize: 25,
      textMode: false,
      showTextInput: false,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      queue: new DoQueue(),
      sideMargin: 0,
      windowW: 1000,
      canvasW: 1000,
      canvasH: 1000,
      inputTextHeight: 40,
      inputTextWidth: 0,
      canvasTexts: [],
      topView: 0,
      zoom: 1.0,
      scaleRatio: 1.0,
      xOffset: 0,
      yOffset: 0,
      xText: 0,
      yText: 0,
      keyboardHeight: 0,
      needCanvasUpdate: false,
      needCanavaDataSave: false,
      needCanvasUpdateTextOnly: false
    }

  }

  _shouldDragText = (evt, gestureState) => {
    return this.state.showTextInput;
  }

  _keyboardDidShow = (e) => {
    this.setState({ keyboardHeight: e.endCoordinates.height });
  }

  _keyboardDidHide = (e) => {
    this.setState({ keyboardHeight: 0 });
  }

  componentDidMount = async () => {
    const page = this.props.navigation.getParam('page', '');
    const currentFile = page.pages.length == 0 ? page.path : page.pages[0];

    const metaDataUri = currentFile + ".json";
    this.setState({ page: page, currentFile: currentFile, metaDataUri: metaDataUri },
      this.Load);
    //setTimeout(this.Load, 500);
  }


  Load = async () => {
    this.loadFile(this.state.metaDataUri);

    if (this.props.navigation.getParam('share', false)) {
      //iterates over all files and exports them
      let dataUrls = [];

      dataUrls.push(await this.exportToBase64());
      for (let i = 1; i < this.state.page.pages.length; i++) {
        const currentFile = this.state.page.pages[i];
        const metaDataUri = currentFile + ".json";
        this.setState({ currentFile, metaDataUri })
        this.loadFile(metaDataUri);
        dataUrls.push(await this.exportToBase64());
      }

      const shareOptions = {
        title: 'שתף בעזרת...',
        subject: 'דף עבודה',
        urls: dataUrls
      };

      Share.open(shareOptions).then(() => { }).catch(err => {
        Alert.alert("הפעולה בוטלה");
      });

    }
  }

  exportToBase64 = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => this.canvas.getBase64(
        'jpg',
        false, //transparent
        true, //includeImage
        true, //includeText
        false, //cropToImageSize
        (err, data) => {
          if (err) {
            reject(err.toString());
            return;
          }
          resolve('data:image/jpg;base64,' + data);
        }
      ), 300)
    });
  }


  loadFile = (metaDataUri) => {
    this.state.queue.clear();
    RNFS.readFile(metaDataUri).then((value) => {
      let sketchState = JSON.parse(value);
      //Alert.alert("Load: "+sketchState.length)
      for (let i = 0; i < sketchState.length; i++) {
        this.state.queue.add(sketchState[i])
      }

    },
      (err) => {/*no json file yet*/ }
    ).catch((e) => {/*no json file yet*/ }).finally(() => {
      //this.UpdateCanvas(true)
      this.setState({ needCanvasUpdate: true, needCanavaDataSave: false });
    });
  }

  Save = () => {
    let sketchState = this.state.queue.getAll();
    const content = JSON.stringify(sketchState);
    RNFS.writeFile(
      this.state.metaDataUri,
      content).then(
        //success
        undefined, //() =>  Alert.alert("File Saved"),
        //fail
        (e) => Alert.alert("File Save Failed" + e));

  }

  async replaceFile(src, dest) {
    //generate temp name for dest:
    const tempName = dest + Date.now().toString();
    return RNFS.moveFile(dest, tempName).then(() =>
      RNFS.moveFile(src, dest)).then(() =>
        RNFS.unlink(tempName));
  }

  SketchEnd = (p) => {
    this.state.queue.pushPath(p);
    this.Save()
  }

  //a = absolute, s=screen, c=canvas
  s2aW = (w) => { return (w - this.state.sideMargin) / ((this.state.zoom - this.state.xOffset)) }
  s2aH = (h) => { return (h - this.state.topView) / ((this.state.zoom - this.state.yOffset)) }// - this.state.inputTextHeight/2}
  a2cW = (w) => { return (w + this.state.xOffset) * this.state.zoom + this.state.sideMargin }
  a2cH = (h) => { return (h + this.state.yOffset) * this.state.zoom + topLayer } // + this.state.inputTextHeight / 2 }

  findColor = (fc) => {
    for (let c in colors) {
      if (colors[c][0] == fc) {
        return colors[c];
      }
    }
    return this.state.color;
  }

  TextModeClick = (ev) => {
    if (this.state.showTextInput) {
      //a text box is visible and a click was pressed - save the text box contents first:
      this.SaveText()
    }

    //check that the click is in the canvas area:
    let x = this.s2aW(ev.nativeEvent.pageX);
    let y = this.s2aH(ev.nativeEvent.pageY) - this.getTextHeight()/2;

    let textElemIndex = this.findTextElement({ x: x, y: y });
    let initialText = '';
    let fontSize = this.state.fontSize;
    let fontColor = this.state.color;
    let inputTextWidth = this.state.inputTextWidth;
    let inputTextHeight = this.state.inputTextHeight;
    let textElem = undefined;
    if (textElemIndex >= 0) {
      textElem = this.state.canvasTexts[textElemIndex];
      initialText = textElem.text;
      fontSize = textElem.fontSize;
      fontColor = this.findColor(textElem.fontColor);
      inputTextWidth = textElem.width;
      inputTextHeight = textElem.height;
      x = textElem.normPosition.x*this.state.scaleRatio;
      y = textElem.normPosition.y*this.state.scaleRatio;
      //remove the text from the canvas:
      //canvasTexts.splice(textElemIndex);

    }

    //Alert.alert("a-x:" + x + ",a-y:" + y + ", ratio:" + this.state.scaleRatio)
    this.setState({
      showTextInput: true,
      inputTextValue: initialText,
      fontSize,
      inputTextWidth,
      inputTextHeight,
      color: fontColor,
      currentTextElem: textElem,
      xText: x,
      yText: y
    });
  }

  SaveText = () => {
    let text = this.state.inputTextValue;
    let origElem = this.state.currentTextElem;
    if (text.length == 0 && !origElem) return;

    let txtWidth = this.state.inputTextWidth;
    let txtHeight = this.state.inputTextHeight;
    let newElem = this.getTextElement(text, txtWidth, txtHeight);
    if (origElem) {
      if (origElem.text == newElem.text &&
        origElem.position.x == newElem.position.x &&
        origElem.position.y == newElem.position.y &&
        origElem.height == newElem.height) {
        return;
      } else {
        //Alert.alert(JSON.stringify(origElem) + "---" + JSON.stringify(newElem))
      }
    }
    this.state.queue.pushText(newElem);
    this.setState({
      needCanvasUpdate: true, needCanavaDataSave: true,
      needCanvasUpdateTextOnly: true
    });
  }

  findTextElement = (coordinates) => {
    let q = this.state.canvasTexts
    // Alert.alert(JSON.stringify(q))
    for (let i = q.length - 1; i >= 0; i--) {
      // Alert.alert(JSON.stringify(q[i].normPosition) + '--\n' + 
      //             JSON.stringify(q[i].position) + '--\n' + 
      //             JSON.stringify(coordinates))
      if (q[i].position.x  < coordinates.x + 15 &&
        q[i].position.x + q[i].width > coordinates.x - 15
        &&
        q[i].position.y < coordinates.y + 15 &&
        q[i].position.y + q[i].height > coordinates.y - 15
      ) {
        //Alert.alert("found:"+ q[i].text)
        return i;
      }
    }

    return -1;
  }

  getTextElement = (newText, width, height) => {
    newTextElem = { text: newText, width: width, height: height }
    if (this.state.currentTextElem) {
      newTextElem.id = this.state.currentTextElem.id;
    } else {
      newTextElem.id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    }

    newTextElem.anchor = { x: 0, y: 0 };
    newTextElem.normPosition = {
      x: this.state.xText/this.state.scaleRatio ,
      y: this.state.yText/this.state.scaleRatio
    };
    newTextElem.position = {x:0,y:0};
    newTextElem.alignment = 'Right';
    newTextElem.fontColor = this.state.color[0];
    newTextElem.fontSize = this.state.fontSize;
    return newTextElem;
  }

  UpdateCanvas = (canvas) => {
    if (!canvas) return;

    if (!this.state.needCanvasUpdateTextOnly) {
      canvas.clear();
    }
    let q = this.state.queue.getAll();
    let canvasTexts = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i].type === 'text') {

        //clone and align to canvas size:
        let txtElem = q[i].elem;
        txtElem.position = {
          x: txtElem.normPosition.x *this.state.scaleRatio - txtElem.width - 15 ,
          y: txtElem.normPosition.y*this.state.scaleRatio 
        };

        //first try to find same ID and replace, or add it
        let found = false;

        for (let j = 0; j < canvasTexts.length; j++) {
          if (canvasTexts[j].id === txtElem.id) {
            canvasTexts[j] = txtElem
            found = true;
            break;
          }
        }
        if (!found) canvasTexts.push(txtElem);
      } else if (q[i].type === 'path' && !this.state.needCanvasUpdateTextOnly) {
        canvas.addPath(q[i].elem);
      }
    }
    if (this.state.needCanavaDataSave) {
      this.Save()
    }
    this.setState({ canvasTexts: canvasTexts, needCanvasUpdate: false, needCanavaDataSave: false, needCanvasUpdateTextOnly: false });

  }

  onTextButton = (inc) => {
    if (!this.state.textMode) {
      this.setState({
        showTextInput: false,
        textMode: true
      });
      return;
    }
    this.setState({ fontSize: this.state.fontSize + (inc * 5) });
  }

  onBrushButton = (inc) => {
    if (this.state.textMode) {
      this.SaveText();
      this.setState({
        showTextInput: false,
        textMode: false
      });
      return;
    }
    let newStrokeWidth = this.canvas.state.strokeWidth + inc;
    this.canvas.setState({ strokeWidth: newStrokeWidth });
    this.setState({ strokeWidth: newStrokeWidth })
  }

  movePage = (inc) => {
    let currentIndex = -1;
    for (let i = 0; i < this.state.page.pages.length; i++) {
      if (this.state.page.pages[i] == this.state.currentFile) {
        currentIndex = i;
        break;
      }
    }
    currentIndex += inc;
    if (currentIndex < 0 || currentIndex >= this.state.page.pages.length) return;

    const currentFile = this.state.page.pages[currentIndex];
    const metaDataUri = currentFile + ".json";
    this.setState({
      currentFile: currentFile, metaDataUri: metaDataUri,
      zoom: 1, xOffset: 0, yOffset: 0
    });
    setTimeout(this.Load, 200)
  }

  onLayout = async (e) => {
    let windowSize = e.nativeEvent.layout;
    const measure = this.topView.measure.bind(this.topView);
    setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
      this.setState({ topView: py })
    });

    //let windowSize = Dimensions.get("window");
    let sideMargin = Math.floor(windowSize.width * .05)

    windowW = windowSize.width - sideMargin * 2;
    windowH = windowSize.height - topLayer * 1.1;
    let currentFile = this.state.currentFile;

    getImageDimensions(currentFile).then(imageSize => {
      //Alert.alert("Dim:" + JSON.stringify(imageSize))
      imageWidth = imageSize.w;
      imageHeight = imageSize.h;
      wDiff = imageWidth - windowW;
      hDiff = imageHeight - windowH;
      let ratio = 1;
      if (wDiff <= 0 && hDiff <= 0) {
        //image fit w/o scale
      } else if (wDiff > hDiff) {
        //scale to fit width
        ratio = windowW / imageWidth;
      } else {
        //scale to fit height
        ratio = windowH / imageHeight;
      }

      this.setState({ windowW: windowW, sideMargin: sideMargin, canvasW: imageWidth * ratio, canvasH: imageHeight * ratio, scaleRatio: ratio, needCanvasUpdate: true, needCanavaDataSave: false });

    }).catch(err => {
      Alert.alert(JSON.stringify(err))
    })
  }

  render() {
    let drawingAreaStyle = {
      flex: 1,
      position: 'absolute',
      top: topLayer,
      left: this.state.sideMargin,
      width: this.state.canvasW,
      height: this.state.canvasH,
      zIndex: 5
    };

    return (

      <LinearGradient colors={['#E2DCCE', '#D4CDBC', '#C1B7A1']} style={styles.mainContainer}
        onLayout={this.onLayout}>

        <TouchableOpacity onPress={this.TextModeClick}
          activeOpacity={1}
          style={[drawingAreaStyle, { backgroundColor: 'black' }]} >
          <View style={{ flex: 1 }}
            ref={v => this.topView = v}
            pointerEvents={this.state.textMode ? 'box-only' : 'auto'}

          >
            <ScrollView
              minimumZoomScale={1}
              maximumZoomScale={maxZoom}
              zoomScale={this.state.zoom}
              style={{ flex: 1 }}
              contentContainerStyle={{ flex: 1 }}
            >
              {this.getCanvas()}
            </ScrollView>
          </View>
        </TouchableOpacity>
        <LinearGradient colors={['#94B2D1', '#6C97C0']} style={{ flex: 1, position: 'absolute', top: 0, width: '100%', height: '20%' }} >
          <View style={[styles.topPanel, { left: this.state.sideMargin }]}>
            {
              getSquareButton(() => {
                if (this.state.zoom == maxZoom) {
                  this.setState({ zoom: 1, xOffset: 0, yOffset: 0 });
                  return;
                }
                this.setState({ zoom: this.state.zoom + .5 })
              }
                , colors.gray, colors.orange, undefined, "search", 30, this.state.zoom > 1)
            }

            {this.getSpace(4)}

            {
              getSquareButton(() => {
                this.state.queue.undo();
                this.setState({ needCanvasUpdate: true, needCanavaDataSave: true });
              }, colors.gray, colors.gray, undefined, "undo", 30, false)
            }
            {this.getSpace(1)}

            {
              getSquareButton(() => {
                this.state.queue.redo();
                this.setState({ needCanvasUpdate: true, needCanavaDataSave: true });
              }, this.state.queue.canRedo() ? colors.gray : colors.disabled, this.state.queue.canRedo() ? colors.gray : colors.disabled,
                undefined, "redo", 30, false)
            }
            {this.getSpace(3)}

            {this.getColorButton(colors.black)}
            {this.getSpace(1)}
            {this.getColorButton(colors.red)}
            {this.getSpace(1)}
            {this.getColorButton(colors.yellow)}
            {this.getSpace(1)}
            {this.getColorButton(colors.green)}
            {this.getSpace(3)}

            {
              getSquareButton(() => { this.onTextButton(-1) },
                colors.gray, this.state.color, "א", undefined, 30, this.state.textMode)
            }
            {
              getSquareButton(() => { this.onTextButton(1) },
                colors.gray, this.state.color, "א", undefined, 40, this.state.textMode)
            }
            {this.getSpace(3)}

            {
              getSquareButton(() => { this.onBrushButton(-1) },
                colors.gray, this.state.color, undefined, "brush", 20, !this.state.textMode)
            }
            {
              getSquareButton(() => { this.onBrushButton(1) },
                colors.gray, this.state.color, undefined, "brush", 30, !this.state.textMode)
            }
            {this.getSpace(3)}
            {
              this.state.textMode ? <View /> :
                <LinearGradient colors={this.state.color} style={{
                  top: 20,
                  width: this.state.strokeWidth + 2,
                  height: this.state.strokeWidth + 2,
                  borderRadius: (this.state.strokeWidth + 2) / 2,
                  alignItems: 'center',
                  justifyContent: 'center'
                }
                }>
                </LinearGradient>
            }
          </View>
        </LinearGradient>

        {
          this.state.showTextInput ?
            //todo height should be relative to text size
            this.getTextInput(this.state.inputTextValue, this.a2cW(this.state.xText), this.a2cH(this.state.yText)) :
            <Text></Text>
        }

        {this.getArrow(LEFT, () => this.setState({ xOffset: this.state.xOffset + 50 }))}
        {this.getArrow(TOP, () => this.setState({ yOffset: this.state.yOffset + 50 }))}
        {this.getArrow(RIGHT, () => this.setState({ xOffset: this.state.xOffset - 50 }))}
        {this.getArrow(BOTTOM, () => this.setState({ yOffset: this.state.yOffset - 50 }))}
        {this.getPageNavigationArrows()}

      </LinearGradient>
    );
  }

  getArrow = (location, func) => {
    let style = { flex: 1, position: 'absolute', zIndex: 10000 }
    let deg = 0;
    if (location == TOP && this.state.yOffset < 0) {
      style.top = topLayer, style.left = 100, deg = -90;
      style.left = this.state.sideMargin + this.state.canvasW / 2
    } else if (location == RIGHT && this.state.zoom > 1) {
      style.top = topLayer + this.state.canvasH / 2;
      style.right = 5, deg = 0;
    } else if (location == BOTTOM && (this.state.zoom > 1 || this.state.keyboardHeight > this.state.yOffset)) {
      style.top = topLayer + this.state.canvasH - 60 - this.state.keyboardHeight, deg = 90;
      style.left = this.state.sideMargin + this.state.canvasW / 2
    } else if (location == LEFT && this.state.xOffset < 0) {
      style.top = topLayer + this.state.canvasH / 2;
      style.left = 5, deg = 180;
    } else {
      return;
    }
    style.transform = [{ rotate: deg + 'deg' }]


    return <View style={style}>
      <Icon
        onPress={func}
        name='play-arrow'
        size={70}
        color="#D16F28"
      />
    </View>
  }
  getPageNavigationArrows = () => {

    if (!this.state.page || this.state.page.pages.length == 0) {
      return <View />;
    }

    return <View
      style={{
        flexDirection: 'row',
        height: '10%',
        position: 'absolute',
        bottom: 0,
        left: this.state.sideMargin,
        width: this.state.canvasW,
        justifyContent: 'space-between',
        zIndex: 1000
      }}
    >
      {(this.state.currentFile == this.state.page.pages[0]) ?
        <View /> :
        getSquareButton(() => this.movePage(-1), colors.navyBlue, undefined, 'דף קודם', 'chevron-left', 30, undefined, { width: 150, height: 60 }, 60, true, 15)

      }

      {(this.state.currentFile == this.state.page.pages[this.state.page.pages.length - 1]) ?
        <View /> :
        getSquareButton(() => this.movePage(1), colors.navyBlue, undefined, 'דף הבא', 'chevron-right', 30, undefined, { width: 150, height: 60 }, 60, false, 0, 15)

      }
    </View>
  }

  getCanvas = () => {
    return <RNSketchCanvas
      ref={component => {
        this.canvas = component;
        if (this.state.needCanvasUpdate) {
          setTimeout(() =>
            this.UpdateCanvas(component), 100);
        }
      }}
      scale={this.state.zoom}
      text={this.state.canvasTexts}
      containerStyle={[styles.container]}
      canvasStyle={[styles.canvas, { transform: [{ translateX: this.state.xOffset }, { translateY: this.state.yOffset }] }]}
      localSourceImage={{ filename: this.state.currentFile, mode: 'AspectFit' }}
      onStrokeEnd={this.SketchEnd}
      strokeColors={[{ color: colors.black[0] }]}
      defaultStrokeIndex={0}
      defaultStrokeWidth={DEFAULT_STROKE_WIDTH}
    />
  }

  getColorButton = (color) => {
    let func = () => {
      this.canvas.setState({ color: color[0] })
      this.setState({ color: color })
    }
    let selected = this.state.color == color;

    return <TouchableOpacity
      onPress={func}
      activeOpacity={1}
    >
      <LinearGradient colors={color} style={[styles.CircleShapeView,
      selected ? styles.selected : styles.notSelected]}>
      </LinearGradient>
    </TouchableOpacity>
  }

  getSpace = (dist) => {
    let space = ''
    for (let i = 0; i < dist; i++) {
      space += ' ';
    }
    return <Text>{space}</Text>
  }

  getTextInput = (txt, x, y) => {
    return <View style={{ flex: 1, position: 'absolute', right: this.state.windowW - x + INITIAL_TEXT_SIZE, top: y, zIndex: 100 }} {...this._panResponder.panHandlers}>
      <TextInput
        onChangeText={(text) => {
          measureText(this.state.fontSize, this.state.inputTextValue).then(size =>
            this.setState({ inputTextValue: text, inputTextWidth: size.width }));
        }}

        autoFocus

        style={[styles.textInput, {
          width: this.state.inputTextWidth < INITIAL_TEXT_SIZE - 20 ? INITIAL_TEXT_SIZE : this.state.inputTextWidth+20,
          height: this.getTextHeight(),
          color: this.state.color[0],
          fontSize: this.state.fontSize
        }]}
      >{txt}</TextInput>
    </View>
  }



  getTextHeight = () => this.state.fontSize + 1.2 + 15;
}

AppRegistry.registerComponent('IssieEditPhoto', () => IssieEditPhoto);

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center'
  },
  fullSizeInParent: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    zIndex: 10
  },
  textInput: {
    borderColor: 'black',
    borderWidth: 1,
    backgroundColor: 'white',
    textAlign: 'right'

  },
  CircleShapeView: {
    width: 50,
    height: 50,
    borderRadius: 50 / 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  selected: {
    marginVertical: 0
  },
  notSelected: {
    marginVertical: 10
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    shadowColor: 'black',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 3
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  topPanel: {
    position: 'absolute',
    flexDirection: 'row',
    top: marginTop,
    height: topLayer,
    backgroundColor: 'transparent'
  }
});
