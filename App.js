import React from "react";
import Expo2DContext from "expo-2d-context";
import { ImageData } from "expo-2d-context";
import { GLView } from "expo-gl";
import { Dimensions, Text, View } from "react-native";
import { Asset } from "expo-asset";
import { Camera } from "expo-camera";
import * as Permissions from "expo-permissions";
import * as ImageManipulator from "expo-image-manipulator";
import { findNodeHandle } from "react-native";

export default class App extends React.Component {
  constructor(props) {
    super(props);
    let width = Dimensions.get("window").width;
    let height = Dimensions.get("window").height;
    this.state = {
      width,
      height,
      step_size: 15,
    };
    this.camera = React.createRef();
    Permissions.askAsync(Permissions.CAMERA);
  }

  _onGLContextCreate = async (gl) => {
    console.log("Create GL");
    var ctx = new Expo2DContext(gl);

    if (this.camera.current) {
      while (true) {
        // Take new picture
        let im = await this.camera.current.takePictureAsync();
        // Make it smaller
        let new_im = await ImageManipulator.manipulateAsync(
          im.uri,
          [{resize: { width: this.state.width }}],
          {}
        );
        // JS magic
        new_im.localUri = new_im.uri;

        // Draw the image
        ctx.drawImage(new_im, 0, 0);
        ctx.flush();
        // Get image data
        var imgd = ctx.getImageData(0, 0, this.state.width, this.state.height);
        ctx.clearRect(0, 0, this.state.width, this.state.height);

        // Threshold the image
        this.threshold(ctx, imgd.data, imgd);
        ctx.clearRect(0, 0, this.state.width, this.state.height);

        // Guess the number
        this.guessNumber(imgd);
        ctx.putImageData(imgd, 0, 0);

        ctx.flush();
      }
    } else {
      console.log("Empty cam :(, please give permission", this.camera);
    }
  };

  threshold = function(ctx, data, imageData) {
    // Threshold the image
    for (var i = 0; i < data.length; i += 4) {
      var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      let val = 0;
      if (avg > 255 / 2) {
        val = 255;
      }
      data[i]     = val; // red
      data[i + 1] = val; // green
      data[i + 2] = val; // blue
    }
    // Create a green line, so we can see where we're scanning
    let offset = (imageData.height / 2) * imageData.width * 2;
    for (let i = 0; i < imageData.width * 4; i += (4 * this.state.step_size)) {
      data[offset + i + 1] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  };

  guessNumber = (image) => {
    // We assume we start in something white
    // When we encounter a black section we increase cnt
    // Then when we encounter
    let cnt = 0;
    let isInWhite = true;
    let offset = (image.height / 2) * image.width * 2;
    for (let i = 0; i < image.width * 4; i += (4 * this.state.step_size)) {
      let val = image.data[offset + i];
      if (val > 127) { // Handle white
        if (!isInWhite) {
          isInWhite = true;
        }
      } else { // Handle black
        if (isInWhite) {
          isInWhite = false;
          cnt += 1;
        }
      }
    }
    console.log("Guess is: ", cnt);
    return cnt;
  }

  render() {return (
      <View>
        <GLView
          style={{ width: this.state.width, height: this.state.height - 100 }}
          onContextCreate={this._onGLContextCreate}
        />
        <Camera
          ref={this.camera}
          style={{ width: this.state.width, height: 150 }}
          type={Camera.Constants.Type.back}
        />
      </View>
    );
  }
}

