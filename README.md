# 分析猫头鹰 (Owl Emotion Analyzer)

一个用于情感分析的Web应用程序，具有可爱的猫头鹰动画响应。

## 功能特点

- 多模态输入：支持文本、图片、视频和音频
- 实时摄像头情绪分析
- 语音输入支持
- 猫头鹰的情绪化动画响应
- 一体化后端控制 - 通过UI启动后端服务

## 安装步骤

### 前端应用

1. 确保您已安装Node.js (推荐v14或更高版本)

2. 安装前端依赖项:

```bash
cd frontend-simple
npm install
```

### 后端服务

确保Python环境已经配置好，并安装了必要的依赖项。

## 运行应用

您可以使用以下方式之一运行应用程序:

### 方法1：通过集成服务器运行（推荐）

这种方法允许您从前端UI启动后端:

```bash
cd frontend-simple
npm run dev
```

这将启动:
- 前端开发服务器在 http://localhost:3000
- 代理服务器在 http://localhost:3001，它允许从UI启动后端

打开应用后，您可以:
1. 点击左上角的设置图标
2. 在设置面板中点击"启动后端服务"按钮

### 方法2：分别启动前端和后端

#### 启动前端:

```bash
cd frontend-simple
npm start
```

#### 手动启动后端:

```bash
cd ..  # 回到项目根目录
python app.py
```

## 使用说明

1. 启动应用程序
2. 确保后端连接正常（如果未连接，使用设置面板启动后端）
3. 使用下面的方法与猫头鹰交互:
   - 输入文本
   - 上传图片/视频/音频
   - 开启摄像头进行实时情绪分析
   - 开启语音输入功能

猫头鹰将根据检测到的情绪改变其动画状态。

## 故障排除

如果遇到"无法连接到后端服务"错误:

1. 点击左上角的设置图标
2. 点击"启动后端服务"按钮
3. 等待几秒钟让后端初始化

如果仍然无法连接，请检查:
- 确保app.py文件位于项目根目录
- 检查Python是否正确安装
- 检查console中的错误信息

## 技术栈

- 前端: React.js
- 后端: Python (Flask)
- 人机交互: WebGazer.js (眼动追踪)
- 通信: Axios, Express.js (代理服务器)

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

### Hello