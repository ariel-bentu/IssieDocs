package com.issiedoc3;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.horcrux.svg.SvgPackage;
import org.devio.rn.splashscreen.SplashScreenReactPackage;
import io.github.airamrguez.RNMeasureTextPackage;
import com.github.amarcruz.rntextsize.RNTextSizePackage;
import io.github.elyx0.reactnativedocumentpicker.DocumentPickerPackage;
import com.filepicker.FilePickerPackage;
import org.wonday.pdf.RCTPdfView;
import com.RNFetchBlob.RNFetchBlobPackage;
import cl.json.RNSharePackage;
import com.imagepicker.ImagePickerPackage;
import io.codebakery.imagerotate.ImageRotatePackage;
import com.reactnativecommunity.imageeditor.ImageEditorPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.terrylinla.rnsketchcanvas.SketchCanvasPackage;
import fr.greweb.reactnativeviewshot.RNViewShotPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.oblador.vectoricons.VectorIconsPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.rnfs.RNFSPackage;
import com.wix.RNCameraKit.RNCameraKitPackage;
import com.terrylinla.rnsketchcanvas.SketchCanvasPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new SvgPackage(),
            new SplashScreenReactPackage(),
            new RNMeasureTextPackage(),
            new RNTextSizePackage(),
            new DocumentPickerPackage(),
            new FilePickerPackage(),
            new RCTPdfView(),
            new RNFetchBlobPackage(),
            new RNSharePackage(),
            new ImagePickerPackage(),
            new ImageRotatePackage(),
            new ImageEditorPackage(),
            new LinearGradientPackage(),
            new SketchCanvasPackage(),
            new RNViewShotPackage(),
            new RNDeviceInfo(),
            new VectorIconsPackage(),
            new RNGestureHandlerPackage(),
            new RNFSPackage(),
            new RNCameraKitPackage(),
            new SketchCanvasPackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
