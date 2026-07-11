---
name: "file-io-styleskill"
description: "读写仓库文件时使用。统一处理中文读取、apply_patch 写入、UTF-8 无 BOM、乱码判断和写后复查。"
---

# 文件读写规范


## 规则

- 没有放权时只能读写当前文件、读其他文件。
- ai截图、调试日志等临时文件，必须输出到根目录`.log/`下
- 删除非你创建的文件必须问用户；创建文件前必须告诉用户，用户要求创建或拆分的不要重复询问。移动文件按创建加删除处理，必须说明来源和目标；删除不属于本次目标或非自己创建的文件前仍确认。
- 所有仓库文件必须是 UTF-8 无 BOM。
- 读取包含中文的规则、模板、Markdown 或配置文件时，先用 `rg` 定位，再用 Node `fs.readFileSync(path, "utf8")` 读取；模板规则复盘、规则源审查、skills 审查和中文 Markdown 审查也必须遵守；禁止使用 PowerShell `Get-Content` 判断内容。若工具输出出现乱码、问号、替换字符或中英混杂异常，本次读取结果作废，立即用 Node UTF-8 重新读取后再判断。
- 维护由模板生成的规则、配置或文档时，必须先识别模板源文件和生成产物；只修改模板源文件，禁止直接修改生成产物，除非用户明确要求临时修改生成结果。
- 用户同时给出当前打开文件和正文明确路径时，以正文明确路径为目标；当前打开文件只作为上下文。若两者不同，必须先说明目标文件选择。
- 人工编辑优先用 `apply_patch`；确需脚本写入时必须显式 UTF-8 无 BOM。
- UTF-8 与 UTF-8 无 BOM 只差文件前三字节是否为 `EF BB BF`；若终端乱码，立即用 Node 检查 `bom` 和 `replacement`，确认后不要重复试错。
- 只处理当前任务涉及的文件，不顺手批量改无关文件。

## 读取和复查

```powershell
node -e "const fs=require('fs'); const b=fs.readFileSync(process.argv[1]); const text=b.toString('utf8'); console.log({ bom:b[0]===0xef&&b[1]===0xbb&&b[2]===0xbf, replacement:text.includes('\\uFFFD') }); console.log(text.slice(0,2000))" $path
```

## 脚本写入

```powershell
$encoding = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($path, $text, $encoding)
```
