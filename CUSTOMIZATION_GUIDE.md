# 日历助手 - 自定义指南

本指南详细说明如何修改网站的配色、字体、布局等各个方面。

---

## 1. 配色修改

### 位置：`client/src/index.css`

所有颜色都通过 CSS 变量定义，修改这个文件即可全局改变配色。

#### 1.1 浅色主题配置（Light Theme）

```css
@layer base {
  :root {
    /* 主色调 - 修改这里改变整个应用的主色 */
    --primary: 59 130 246;           /* 蓝色 */
    --primary-foreground: 255 255 255;

    /* 背景与文字 */
    --background: 255 255 255;       /* 白色背景 */
    --foreground: 15 23 42;          /* 深灰色文字 */

    /* 次要色 */
    --secondary: 226 232 240;        /* 浅灰 */
    --secondary-foreground: 15 23 42;

    /* 强调色 - 用于按钮、链接等 */
    --accent: 168 85 247;            /* 紫色 */
    --accent-foreground: 255 255 255;

    /* 卡片背景 */
    --card: 255 255 255;
    --card-foreground: 15 23 42;

    /* 边框颜色 */
    --border: 226 232 240;
    --input: 226 232 240;

    /* 其他 */
    --muted: 148 163 184;
    --muted-foreground: 100 116 139;
    --destructive: 239 68 68;        /* 红色 - 删除、错误 */
    --ring: 59 130 246;
  }
}
```

#### 1.2 常见配色方案

**蓝色方案（当前）**
```css
--primary: 59 130 246;      /* 蓝色 */
--accent: 168 85 247;       /* 紫色 */
```

**绿色方案**
```css
--primary: 34 197 94;       /* 绿色 */
--accent: 14 165 233;       /* 天蓝色 */
```

**紫色方案**
```css
--primary: 168 85 247;      /* 紫色 */
--accent: 236 72 153;       /* 粉色 */
```

**橙色方案**
```css
--primary: 249 115 22;      /* 橙色 */
--accent: 239 68 68;        /* 红色 */
```

#### 1.3 深色主题支持

如果想添加深色主题，在 `client/src/App.tsx` 中修改：

```tsx
<ThemeProvider
  defaultTheme="light"  // 改为 "dark" 使用深色主题
  switchable            // 取消注释以支持主题切换
>
```

然后在 `index.css` 中添加深色主题配置：

```css
@layer base {
  .dark {
    --background: 15 23 42;          /* 深灰色背景 */
    --foreground: 248 250 252;       /* 白色文字 */
    --card: 30 41 59;
    --card-foreground: 248 250 252;
    --border: 51 65 85;
    --secondary: 51 65 85;
    /* ... 其他颜色 */
  }
}
```

---

## 2. 字体修改

### 位置：`client/index.html` 和 `client/src/index.css`

#### 2.1 修改 Google Fonts

在 `client/index.html` 的 `<head>` 中找到：

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

**常见字体替换：**

- **现代简洁**：`Poppins` 或 `Outfit`
  ```html
  family=Poppins:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700
  ```

- **优雅衬线**：`Playfair+Display` + `Noto+Serif+SC`
  ```html
  family=Playfair+Display:wght@600;700&family=Noto+Serif+SC:wght@400;500;700
  ```

- **科技感**：`JetBrains+Mono` + `Noto+Sans+SC`
  ```html
  family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700
  ```

#### 2.2 在 CSS 中应用字体

在 `client/src/index.css` 中修改：

```css
@layer base {
  body {
    font-family: "Inter", "Noto Sans SC", sans-serif;  /* 修改这里 */
    font-size: 14px;
    line-height: 1.6;
  }

  h1, h2, h3 {
    font-family: "Inter", "Noto Sans SC", sans-serif;
    font-weight: 600;
  }
}
```

---

## 3. 背景与视觉效果修改

### 位置：`client/src/index.css`

#### 3.1 修改渐变背景

找到 `.gradient-bg` 类：

```css
.gradient-bg {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 50%, #faf5ff 100%);
  pointer-events: none;
  z-index: -1;
}
```

**常见渐变方案：**

**蓝紫渐变（当前）**
```css
background: linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 50%, #faf5ff 100%);
```

**绿色渐变**
```css
background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdfa 100%);
```

**暖色渐变**
```css
background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
```

**深色渐变**
```css
background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%);
```

#### 3.2 修改玻璃拟态效果

找到 `.glass-card` 类：

```css
.glass-card {
  background: rgba(255, 255, 255, 0.7);  /* 透明度：0.7 = 70% 透明 */
  backdrop-filter: blur(12px);            /* 模糊程度：12px */
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

**调整透明度和模糊：**
- 更透明（更轻盈）：改为 `0.5` 或 `0.6`
- 更不透明（更清晰）：改为 `0.85` 或 `0.9`
- 更强模糊效果：改为 `16px` 或 `20px`
- 更弱模糊效果：改为 `8px`

---

## 4. 间距与布局修改

### 位置：`client/src/pages/Home.tsx` 和 `client/src/index.css`

#### 4.1 修改卡片内间距

在 Home.tsx 中找到卡片元素，修改 `p-6`（padding）：

```tsx
<div className="glass-card rounded-2xl p-6 space-y-5">
  {/* p-6 = 1.5rem (24px) 内间距 */}
  {/* 改为 p-4 = 1rem (16px) - 更紧凑 */}
  {/* 改为 p-8 = 2rem (32px) - 更宽松 */}
</div>
```

#### 4.2 修改圆角

修改 `rounded-2xl`（border-radius）：

```tsx
rounded-lg      /* 8px - 小圆角 */
rounded-xl      /* 12px - 中圆角 */
rounded-2xl     /* 16px - 大圆角（当前） */
rounded-3xl     /* 18px - 超大圆角 */
```

#### 4.3 修改间距

修改 `space-y-5`（元素间距）：

```tsx
space-y-2       /* 8px - 紧凑 */
space-y-3       /* 12px */
space-y-4       /* 16px */
space-y-5       /* 20px（当前） */
space-y-6       /* 24px - 宽松 */
```

---

## 5. 表格样式修改

### 位置：`client/src/pages/Home.tsx`

找到表格部分（`<table>` 标签）：

```tsx
<tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
  {/* 修改这里改变行高亮效果 */}
  {/* hover:bg-muted/20 = 20% 不透明度 */}
  {/* 改为 hover:bg-primary/5 = 5% 主色高亮 */}
</tr>
```

**常见修改：**

```tsx
/* 更强的行高亮 */
hover:bg-primary/10

/* 更弱的行高亮 */
hover:bg-muted/10

/* 彩色高亮 */
hover:bg-green-50    /* 绿色 */
hover:bg-blue-50     /* 蓝色 */
hover:bg-purple-50   /* 紫色 */
```

---

## 6. 按钮样式修改

### 位置：`client/src/pages/Home.tsx`

找到按钮元素：

```tsx
<Button className="gap-2 px-6">
  {/* 修改这里改变按钮样式 */}
</Button>
```

**常见修改：**

```tsx
/* 改变按钮大小 */
size="sm"        /* 小 */
size="default"   /* 默认（当前） */
size="lg"        /* 大 */

/* 改变按钮变体 */
variant="default"    /* 实心（当前） */
variant="outline"    /* 描边 */
variant="ghost"      /* 幽灵（无背景） */
variant="secondary"  /* 次要色 */
```

---

## 7. 动画与过渡效果修改

### 位置：`client/src/index.css` 和 `client/src/pages/Home.tsx`

#### 7.1 修改过渡时间

在 Home.tsx 中找到 `transition-all` 或 `transition-colors`：

```tsx
transition-all duration-200      /* 200ms（当前） */
transition-all duration-300      /* 300ms - 更慢 */
transition-all duration-500      /* 500ms - 很慢 */
transition-all duration-100      /* 100ms - 很快 */
```

#### 7.2 修改加载动画

找到 `animate-pulse` 或 `animate-spin`：

```tsx
animate-spin     /* 旋转加载 */
animate-pulse    /* 脉冲加载（当前） */
animate-bounce   /* 弹跳加载 */
```

---

## 8. 响应式断点修改

### 位置：`client/src/pages/Home.tsx`

修改响应式类名：

```tsx
/* 当前断点 */
hidden sm:block      /* 在小屏幕隐藏，大屏幕显示 */
flex flex-col sm:flex-row  /* 手机竖排，平板横排 */

/* 常见修改 */
md:grid-cols-2   /* 中等屏幕 2 列 */
lg:grid-cols-3   /* 大屏幕 3 列 */
xl:grid-cols-4   /* 超大屏幕 4 列 */
```

---

## 9. 快速修改示例

### 示例 1：改成绿色主题 + 暖色背景

1. 打开 `client/src/index.css`
2. 修改主色：
   ```css
   --primary: 34 197 94;        /* 绿色 */
   --accent: 59 130 246;        /* 蓝色 */
   ```
3. 修改背景：
   ```css
   background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
   ```

### 示例 2：改成深色主题

1. 在 `client/src/App.tsx` 中：
   ```tsx
   <ThemeProvider defaultTheme="dark">
   ```
2. 在 `client/src/index.css` 中添加深色配置（参考第 1.3 节）

### 示例 3：改成更紧凑的布局

1. 打开 `client/src/pages/Home.tsx`
2. 找到所有 `p-6` 改为 `p-4`
3. 找到所有 `space-y-5` 改为 `space-y-3`
4. 找到所有 `rounded-2xl` 改为 `rounded-xl`

---

## 10. 在线修改（推荐方式）

如果您想实时预览修改效果，可以使用 Manus 管理界面的**可视化编辑器**：

1. 在项目管理界面点击 **Preview** 面板
2. 选择任何元素，右侧会出现编辑面板
3. 直接修改颜色、间距、字体等
4. 修改会自动保存为新的检查点

---

## 11. 获取帮助

如果您想修改某个具体方面，可以告诉我：
- **具体要改什么**（例如："把主色改成绿色"）
- **想要的效果**（例如："更紧凑的布局"）
- **参考图片或描述**（例如："像 Figma 的配色"）

我会帮您快速定位文件和修改代码。

---

## 常用 Tailwind 类名参考

| 类名 | 效果 |
|------|------|
| `p-4` / `p-6` / `p-8` | 内间距 |
| `rounded-lg` / `rounded-2xl` | 圆角 |
| `gap-2` / `gap-4` | 元素间距 |
| `text-sm` / `text-base` / `text-lg` | 字体大小 |
| `font-medium` / `font-semibold` / `font-bold` | 字体粗细 |
| `text-primary` / `text-muted-foreground` | 文字颜色 |
| `bg-primary` / `bg-muted` | 背景颜色 |
| `border-border` / `border-primary` | 边框颜色 |
| `hover:bg-muted` | 悬停效果 |
| `transition-all duration-300` | 过渡动画 |
| `hidden sm:block` | 响应式显示 |
