# Rename to zip
Rename-Item -Path "public\Database_Template.xlsx" -NewName "Database_Template.zip" -Force

# Extract
Expand-Archive -Path "public\Database_Template.zip" -DestinationPath "public\temp_excel" -Force
Remove-Item -Path "public\Database_Template.zip" -Force

# Modify sheet1.xml
$filePath = "public\temp_excel\xl\worksheets\sheet1.xml"
$content = [System.IO.File]::ReadAllText($filePath)

# Regex matching to keep only Row 1 and Row 2 inside <sheetData> and only T2/V2 inside <hyperlinks>
$newSheetData = '<sheetData><row r="1"><c r="A1" s="1" t="s"><v>0</v></c><c r="B1" s="2" t="s"><v>1</v></c><c r="C1" s="2" t="s"><v>2</v></c><c r="D1" s="2" t="s"><v>3</v></c><c r="E1" s="2" t="s"><v>4</v></c><c r="F1" s="2" t="s"><v>5</v></c><c r="G1" s="2" t="s"><v>6</v></c><c r="H1" s="2" t="s"><v>7</v></c><c r="I1" s="2" t="s"><v>8</v></c><c r="J1" s="2" t="s"><v>9</v></c><c r="K1" s="3" t="s"><v>10</v></c><c r="L1" s="3" t="s"><v>11</v></c><c r="M1" s="2" t="s"><v>12</v></c><c r="N1" s="3" t="s"><v>13</v></c><c r="O1" s="3" t="s"><v>14</v></c><c r="P1" s="2" t="s"><v>15</v></c><c r="Q1" s="2" t="s"><v>16</v></c><c r="R1" s="2" t="s"><v>17</v></c><c r="S1" s="2" t="s"><v>18</v></c><c r="T1" s="2" t="s"><v>19</v></c><c r="U1" s="2" t="s"><v>20</v></c><c r="V1" s="2" t="s"><v>21</v></c></row><row r="2"><c r="A2" s="4"><v>1.0</v></c><c r="B2" s="5" t="s"><v>22</v></c><c r="C2" s="5" t="s"><v>23</v></c><c r="D2" s="5" t="s"><v>24</v></c><c r="E2" s="6" t="s"><v>25</v></c><c r="F2" s="6" t="s"><v>26</v></c><c r="G2" s="6" t="s"><v>27</v></c><c r="H2" s="6" t="s"><v>28</v></c><c r="I2" s="6" t="s"><v>29</v></c><c r="J2" s="6" t="s"><v>30</v></c><c r="K2" s="6" t="s"><v>31</v></c><c r="L2" s="7" t="s"><v>32</v></c><c r="M2" s="7"><f>6282124322804</f><v>6282124322804</v></c><c r="N2" s="8" t="s"><v>33</v></c><c r="O2" s="6" t="s"><v>34</v></c><c r="P2" s="7" t="s"><v>35</v></c><c r="Q2" s="9"/><c r="R2" s="7" t="s"><v>36</v></c><c r="S2" s="9"/><c r="T2" s="10" t="s"><v>37</v></c><c r="U2" s="6" t="s"><v>38</v></c><c r="V2" s="11" t="s"><v>39</v></c></row></sheetData>'

$content = $content -replace '<sheetData>.*?</sheetData>', $newSheetData

$newHyperlinks = '<hyperlinks><hyperlink r:id="rId1" ref="T2"/><hyperlink r:id="rId2" ref="V2"/></hyperlinks>'
$content = $content -replace '<hyperlinks>.*?</hyperlinks>', $newHyperlinks

[System.IO.File]::WriteAllText($filePath, $content)

# Compress back to zip
Compress-Archive -Path "public\temp_excel\*" -DestinationPath "public\Database_Template.zip" -Force

# Rename back to xlsx
Rename-Item -Path "public\Database_Template.zip" -NewName "Database_Template.xlsx" -Force

# Cleanup temp folder
Remove-Item -Path "public\temp_excel" -Recurse -Force

Write-Host "Excel template example rows updated successfully!"
