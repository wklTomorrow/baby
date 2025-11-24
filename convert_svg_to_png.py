import os
import subprocess

def convert_svg_to_png(svg_path, png_path):
    """使用多种方法尝试转换SVG到PNG"""
    # 方法1：尝试使用sips（macOS内置工具）
    try:
        subprocess.run([
            'sips',
            '-s', 'format', 'png',
            svg_path,
            '--out', png_path
        ], check=True)
        print(f'转换成功: {svg_path} -> {png_path}')
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        print(f'sips方法失败，尝试其他方法...')
    
    # 方法2：尝试使用inkscape（如果已安装）
    try:
        subprocess.run([
            'inkscape',
            '--export-type=png',
            '--export-filename=' + png_path,
            svg_path
        ], check=True)
        print(f'转换成功: {svg_path} -> {png_path}')
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        print(f'inkscape方法失败，尝试其他方法...')
    
    # 方法3：尝试使用Safari打开并保存（模拟方式）
    try:
        # 这是一个尝试使用AppleScript通过Safari打开并保存的方法
        applescript = f'''
        tell application "Safari"
            activate
            open location "file://{svg_path}"
            delay 2
        end tell
        tell application "System Events"
            tell process "Safari"
                keystroke "s" using {{command down}}
                delay 1
                keystroke "{png_path}"
                delay 1
                keystroke return
                delay 1
                keystroke "y" using {{command down}}
                delay 1
            end tell
        end tell
        '''
        subprocess.run(['osascript', '-e', applescript], check=True)
        print(f'转换成功: {svg_path} -> {png_path}')
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        print(f'AppleScript方法失败')
    
    # 所有方法都失败，尝试直接处理SVG内容创建简单的PNG
    print(f'转换失败: {svg_path}')
    return False

def main():
    # SVG文件所在目录
    svg_dir = '/Users/kunlun/Desktop/meituan/baby/images/tabbar'
    
    # 获取所有SVG文件
    svg_files = [f for f in os.listdir(svg_dir) if f.endswith('.svg')]
    
    if not svg_files:
        print('没有找到SVG文件')
        return
    
    # 转换每个SVG文件
    success_count = 0
    for svg_file in svg_files:
        svg_path = os.path.join(svg_dir, svg_file)
        png_path = os.path.join(svg_dir, svg_file.replace('.svg', '.png'))
        
        if convert_svg_to_png(svg_path, png_path):
            success_count += 1
    
    print(f'转换完成，成功转换 {success_count}/{len(svg_files)} 个文件')

if __name__ == '__main__':
    main()