import re

with open("src/app/dashboard/settings/page.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    line_num = i + 1
    
    # Remove Select import
    if line_num == 11: continue
    
    # Remove Payment related icons
    if line_num >= 15 and line_num <= 22:
        if "IconLoader," in line or "IconCheck," in line:
            new_lines.append(line)
        continue
        
    # Remove Bank options and interface
    if line_num >= 30 and line_num <= 51: continue
    
    # Remove payment state
    if line_num >= 69 and line_num <= 91: continue
    
    # Remove fetchPaymentInfo call
    if line_num == 98: continue
    
    # Remove payment handlers
    if line_num >= 193 and line_num <= 309: continue
    
    # Remove payment tab trigger
    if line_num >= 344 and line_num <= 348: continue
    
    # Remove payment tab content and dialog
    if line_num >= 596 and line_num <= 913: continue
    
    new_lines.append(line)

with open("src/app/dashboard/settings/page.tsx", "w") as f:
    f.writelines(new_lines)
