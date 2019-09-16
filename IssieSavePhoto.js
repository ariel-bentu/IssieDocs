
import React from 'react';
import {
  ImageBackground, TextInput, StyleSheet, View, Text,
  Alert, Dimensions, PanResponder, ImageEditor
} from 'react-native';
import { FOLDERS_DIR } from './GaleryScreen';
import * as RNFS from 'react-native-fs';
import Pdf from 'react-native-pdf';
import ViewShot from "react-native-view-shot";
import { StackActions } from 'react-navigation';

import {
  getSquareButton, colors, getImageDimensions,
  globalStyles, NEW_FOLDER_NAME, NO_FOLDER_NAME, DEFAULT_FOLDER_NAME,
  getPageNavigationButtons, getFileNameDialog, semanticColors, getFolderAndIcon,
  Spacer
} from './elements'
import ImageRotate from 'react-native-image-rotate';
import { getNewPage, saveFile, cloneToTemp, SRC_RENAME } from './newPage'
import { pushFolderOrder } from './sort'

const OK_Cancel = 1;
const PickName = 2;
const PickFolder = 3;

const headerHeight = 60;
const panBroderDistance = 80;

export default class IssieSavePhoto extends React.Component {
  static navigationOptions = {
    title: 'שמור דף',
  };

  constructor() {
    super();

    let panResponderMoveSaveForm = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
      onPanResponderMove: (evt, gestureState) => {
        let yOffsetBegin = this.state.yOffsetBegin;
        if (!yOffsetBegin) {
          yOffsetBegin = this.state.yOffset;
        }
        let newYOffset = yOffsetBegin + gestureState.dy;
        if (newYOffset > 0) {
          newYOffset = 0;
        }
        this.setState({
          yOffsetBegin, yOffset: newYOffset
        });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx == 0 && gestureState.dy == 0) {
          return
        }
        this.setState({
          yOffsetBegin: undefined
        });
      }
    });

    this.state = {
      phase: OK_Cancel,
      cropping: false,
      topView: 0,
      multiPageState: { pages: [] },
      pdfWidth: '100%',
      pdfHeight: '100%',
      pdfPageCount: 0,
      yOffset:0,
      panResponderMoveSaveForm
    };
    this.OK.bind(this);

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => this.state.cropping,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => this.state.cropping,
      onMoveShouldSetPanResponder: (evt, gestureState) => this.state.cropping,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => this.state.cropping,
      onPanResponderMove: (evt, gestureState) => {
        if (this.state.cropping) {
          let panStartX = gestureState.x0, panStartY = gestureState.y0 - this.state.topView - headerHeight;

          let msg = ("x:" + panStartX + " d-" + gestureState.dx + ", y:" + panStartY + " d-" + gestureState.dy);
          let cd = this.state.cropData;
          if (this.state.panStartX != panStartX && this.state.panStartY != panStartY) {
            let panStartCD = {};
            Object.assign(panStartCD, cd);
            this.setState({
              panStartX: panStartX,
              panStartY: panStartY,
              panStartCropData: panStartCD,
              msg: 'startPan'
            })
            return;
          }
          let moved = false;
          let ocd = this.state.panStartCropData;
          let left = panStartX - ocd.x;
          let right = ocd.x + ocd.width - panStartX;
          let top = panStartY - ocd.y;
          let bottom = ocd.y + ocd.height - panStartY;

          if (left < panBroderDistance) {
            cd.x = ocd.x + gestureState.dx;
            cd.width = ocd.width - gestureState.dx;
            moved = true
          } else if (right < panBroderDistance) {
            cd.width = ocd.width + gestureState.dx;
            moved = true;
          }

          if (top < panBroderDistance) {
            cd.y = ocd.y + gestureState.dy;
            cd.height = ocd.height - gestureState.dy;
            moved = true
          } else if (bottom < panBroderDistance) {
            cd.height = ocd.height + gestureState.dy;
            moved = true;
          }

          if (!moved) {
            cd.x = ocd.x + gestureState.dx;
            cd.y = ocd.y + gestureState.dy;
          }
          this.setState({ msg: msg, cropData: cd });;
        }
      }
    });



    

    

  }

  componentDidMount = async () => {
    let uri = this.props.navigation.getParam('uri', '');
    let folder = this.props.navigation.getParam('folder', '')
    let pageName = this.props.navigation.getParam('name', '')
    let pdf = false;
    if (uri.endsWith('.pdf')) {
      pdf = true;
      //      Alert.alert(FOLDERS_DIR);
    }
    //Alert.alert(JSON.stringify({ uri, pdf, pdfPage: 1, folder, newFolderName:folder, pageName, phase }))
    await this.initFolderList()
    this.setState({ uri, pdf, pdfPage: 1, folder, pageName });
    if (!pdf) {
      this.updateImageDimension();
    }
    this.onLayout();
    if (this.isRename()) {
      setTimeout(() => this.setState({ phase: PickName }), 50);
    }
  }

  isRename = () => this.props.navigation.getParam('imageSource', '') === SRC_RENAME;

  updateImageDimension = async () => {
    setTimeout(async () => {
      let size = await getImageDimensions(this.state.uri);
      this.setState({ imgSize: size })
    }, 50);
  }

  onLayout = async () => {
    const measure = this.topView.measure.bind(this.topView);
    setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
      this.setState({ topView: py })
    });
  }

  OK = async () => {
    if (this.state.phase == OK_Cancel) {

      if (this.state.pdf) {
        let pages = [];
        if (this.state.pdfPageCount > 1) {
          for (let i = 1; i < this.state.pdfPageCount; i++) {
            let savedPdfPageUri = await this.exportPdfPage(i);

            let page = { uri: savedPdfPageUri, index: i - 1 }
            //push at the begining
            pages.push(page);
          }
          if (pages.length > 0) {
            multiPageState = { pages: pages }
          }

        }

        let uri = await this.exportPdfPage(this.state.pdfPageCount);

        this.setState({
          uri: uri, multiPageState: pages.length > 0 ?
            { pages: pages } :
            this.state.multiPageState,
          pdf: false
        });

      }

      this.setState({ phase: PickName });
    } else if (this.state.phase == PickName) {
      if (!this.state.pageName || this.state.pageName.length == 0) {
        Alert.alert('חובה לבחור שם לדף');
        return;
      }
      if (this.state.folder === NEW_FOLDER_NAME &&
        (!this.state.newFolderName || this.state.newFolderName.length == 0)) {
        Alert.alert('חובה לבחור שם לתיקיה החדשה');
        return;
      }
      this.save();
    }
  }

  save = async () => {
    let folderName = this.state.folder;
    let fileName = this.state.pageName;

    if (!fileName) {
      Alert.alert('חובה לבחור שם לדף');
      return;
    }
    if (!folderName || folderName == NO_FOLDER_NAME) {
      folderName = DEFAULT_FOLDER_NAME;
    } else if (folderName == NEW_FOLDER_NAME) {
      folderName = this.state.newFolderName;
    }

    let targetFolder = FOLDERS_DIR + folderName;
    let filePath = targetFolder + "/" + fileName + ".jpg";

    //first check if folder exists - if not create it and make it first in order
    try {
      let stat = await RNFS.stat(targetFolder);
    } catch (e) {
      await RNFS.mkdir(targetFolder);
      if (folderName !== DEFAULT_FOLDER_NAME) {
        await pushFolderOrder(folderName)
      }
    }

    if (this.state.multiPageState.pages.length > 0 && !this.isRename()) {
      //create a folder with the name fo the file
      targetFolder = targetFolder + "/" + fileName;
      //todo check existing
      await RNFS.mkdir(targetFolder);
      let i = 0;
      for (; i < this.state.multiPageState.pages.length; i++) {
        let page = this.state.multiPageState.pages[i];
        await saveFile(page.uri, targetFolder + "/" + i + ".jpg");
      }
      filePath = targetFolder + "/" + i + ".jpg";
    }

    saveFile(this.state.uri, filePath).then(
      async () => {
        if (this.isRename() && this.state.uri.endsWith('.jpg')) {
          try {
            await saveFile(this.state.uri + ".json", filePath + ".json");
          } catch (e) {
            //ignore, as maybe json is missing
          }
        }
        let returnFolderCallback = this.props.navigation.getParam('returnFolderCallback', undefined);
        if (returnFolderCallback) {
          returnFolderCallback(folderName);
        }
        this.props.navigation.dispatch(StackActions.popToTop());
        // if (folderName !== DEFAULT_FOLDER_NAME) {
        //   this.props.navigation.push('Home', { folder: folderName });
        // } else {
        //   this.props.navigation.pop();
        // }
      },
      (err) => Alert.alert(err)
    ).catch(err => {
      Alert.alert(err)
    });
  }

  exportPdfPage = async (page) => {
    return new Promise((resolve, reject) => {
      this.setState({ pdfPage: page });
      setTimeout(
        () => {
          let viewShot = this.refs.viewShot;
          viewShot.capture().then(
            uri => cloneToTemp(uri).then(newUri => resolve(newUri)),
            err => {
              reject(err)
            }
          );
        }, 1000);
    }
    );
  }

  Cancel = () => {
    let multiPageState = this.state.multiPageState;
    if (multiPageState.pages.length == 0) {
      this.props.navigation.goBack();
    } else {
      let lastPage = multiPageState.pages.pop();
      this.setState({ uri: lastPage.uri, state: OK_Cancel, multiPageState: multiPageState })
    }
  }

  AddPage = () => {
    let imageSource = this.props.navigation.getParam('imageSource');
    getNewPage(imageSource,
      (uri) => {
        let multiPageState = this.state.multiPageState;
        let page = { uri: this.state.uri, index: multiPageState.pages.length }
        multiPageState.pages.push(page);

        this.setState({ uri: uri, state: OK_Cancel, multiPageState: multiPageState })
      },
      //cancel
      () => { });
  }

  rotateLeft = () => this.rotate(-90);
  rotateRight = () => this.rotate(90);
  crop = () => {
    let windowSize = Dimensions.get("window");
    this.setState({
      cropping: true,
      cropData: {
        x: 0,
        y: 0,
        width: windowSize.width,
        height: windowSize.height - headerHeight - this.state.topView,
        scaleX: windowSize.width / this.state.imgSize.w,
        scaleY: windowSize.height / this.state.imgSize.h
      },
      windowSize: windowSize
    });
  }
  cancelCrop = () => this.setState({ cropping: false });
  acceptCrop = () => {
    let cd = this.state.cropData;
    let cropData = {
      offset: { x: cd.x / cd.scaleX, y: cd.y / cd.scaleY },
      size: { width: cd.width / cd.scaleX, height: cd.height / cd.scaleY },
      displaySize: {
        width: this.state.imgSize.w,
        height: this.state.imgSize.h
      },
      resizeMode: 'stretch'
    };
    ImageEditor.cropImage(this.state.uri, cropData,
      //success: 
      (newUri) => {
        this.setState({ uri: newUri, cropping: false });
        this.updateImageDimension()
      },
      //failure: 
      (error) => { }
    );
  }

  rotate = (deg) => {
    ImageRotate.rotateImage(this.state.uri, deg,
      //success: 
      (newUri) => {
        this.setState({ uri: newUri });
        this.updateImageDimension()
      },
      //failure: 
      (error) => { });
  }

  initFolderList = async () => {
    if (this.state.folders) return this.state.folders;

    RNFS.readDir(FOLDERS_DIR).then(folders => {
      this.setState({ folders: folders.filter(f => f.isDirectory() && f.name !== DEFAULT_FOLDER_NAME).map(f => f.name) });
    });
  }

  movePage = (inc) => {
    this.setState({ pdfPage: this.state.pdfPage + inc });
  }


  render() {
    let uri = this.state.uri;
    //if (uri && uri.length > 0) Alert.alert(uri)

    let header = <View />;
    let buttons = <View />;
    let PageNameInput = <View />;
    let saveMoreThanOne = this.state.multiPageState.pages.length > 0 ? '-' + (this.state.multiPageState.pages.length + 1) : ''
    if (!this.state.cropping &&
      (this.state.phase == OK_Cancel ||
        this.state.phase == PickName ||
        this.state.phase == PickFolder)) {
      buttons = <View style={{
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'flex-end',
        right: '5%', height: 60, top: 10
      }}>

        {getSquareButton(this.Cancel, semanticColors.cancelButtonG, undefined, "בטל", "close", 35, undefined, { width: 150, height: 50 }, 45, true)}
        <Spacer width={10} />
        {getSquareButton(this.OK, semanticColors.okButtonG, undefined, "שמור" + saveMoreThanOne, "check", 35, undefined, { width: 150, height: 50 }, 45, true)}
        {this.state.phase == OK_Cancel && !this.state.pdf ?
          <Spacer width={10} /> : null}
        {this.state.phase == OK_Cancel && !this.state.pdf ?
          getSquareButton(this.AddPage, semanticColors.addButtonG, undefined, "דף נוסף", "add", 35, undefined, { width: 150, height: 50 }, 45, true) :
          null
        }

      </View>;
    }

    let editPhoto = this.state.phase == OK_Cancel && !this.state.pdf;

    header = <View style={{ flexDirection: 'row', height: headerHeight }}>
      {editPhoto ? <View style={{ flexDirection: 'row' }}>
        {getSquareButton(this.crop, semanticColors.actionButtonG, semanticColors.actionButtonG, undefined, "crop", 45, this.state.cropping)}
        <Spacer width={10} />
        {this.state.cropping ? getSquareButton(this.cancelCrop, semanticColors.actionButtonG, undefined, undefined, "cancel", 45, false) : <View />}
        {this.state.cropping ? <Spacer width={10} /> : null}
        {this.state.cropping ? getSquareButton(this.acceptCrop, semanticColors.actionButtonG, undefined, undefined, "check", 45, false) : <View />}

        {this.state.cropping ? <View /> : getSquareButton(this.rotateLeft, semanticColors.actionButtonG, undefined, undefined, "rotate-left", 45, false)}
        <Spacer width={10} />
        {this.state.cropping ? <View /> : getSquareButton(this.rotateRight, semanticColors.actionButtonG, undefined, undefined, "rotate-right", 45, false)}
      </View> : null}
      {buttons}
    </View>


    if (this.state.phase == PickName) {
      PageNameInput = getFileNameDialog(
        this.state.pageName,
        getFolderAndIcon(this.state.folder), 
        getFolderAndIcon(this.state.newFolderName),
        this.state.folders,
        (text) => this.setState({ pageName: text }),
        (text) => this.setState({ folder: text }),
        (text) => this.setState({ newFolderName: text })
      )
    }

    let cropFrame = <View />;
    if (this.state.cropping) {
      cropFrame = <View
        style={{
          position: 'absolute',
          width: this.state.cropData.width,
          height: this.state.cropData.height,
          top: this.state.cropData.y,
          left: this.state.cropData.x,

          borderColor: 'black',
          borderWidth: 5,
          borderStyle: 'dashed',
        }}
        {...this._panResponder.panHandlers}
      >
        {/* <Text>{this.state.msg}</Text> */}

      </View>
    }

    return (
      <View style={styles.container}
        ref={v => this.topView = v}
        onLayout={this.onLayout}>

        {header}
        {this.state.pdf ?
          <View style={{
            flex: 1
          }}>
            <ViewShot ref="viewShot" options={{ format: "jpg", quality: 0.9 }}
              style={{
                flex: 1, position: 'absolute', width: this.state.pdfWidth, height: this.state.pdfHeight
              }}>
              <Pdf
                source={{ uri: this.state.uri }}
                page={this.state.pdfPage}
                style={{ flex: 1 }}
                onLoadComplete={(numberOfPages, filePath, dim) => {
                  if (!this.state.pdfWidthOnce) {
                    this.setState({ pdfWidthOnce: true, pdfPageCount: numberOfPages, pdfWidth: dim.width, pdfHeight: dim.height });
                  }
                }}

                onError={(error) => {
                  //Alert.alert(error);
                }}
              >

              </Pdf>
            </ViewShot>
            {PageNameInput}
          </View> :
          <ImageBackground
            style={styles.bgImage}
            imageStyle={{ resizeMode: 'contain' }}
            blurRadius={this.state.phase == OK_Cancel ? 0 : 20}
            source={this.state.phase == OK_Cancel ? { uri } : undefined}
          >
            {cropFrame}
            {PageNameInput}

          </ImageBackground>}
        {this.state.PickName || this.state.pdf && this.state.pdfPageCount < 2 || !this.state.pdf ?
          null :
          getPageNavigationButtons(0, this.state.pdfWidth,
            this.state.pdfPage == 1, //isFirst
            this.state.pdfPage == this.state.pdfPageCount, //isLast
            (inc) => this.movePage(inc))}
      </View>
    );
  };

}
const styles = StyleSheet.create({
  bgImageView: {
    backgroundColor: 'blue',
    flex: 1,
    position: 'absolute',
    top: 0, bottom: 0, right: 0, left: 0,
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: 'grey',
    opacity: 5
  },
  bgImage: {
    flex: 1,
    width: '100%',
    backgroundColor: 'grey',
    opacity: 5
  }

});