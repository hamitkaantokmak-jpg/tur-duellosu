# Same official Identify request as the Node acquisition script; Windows HTTP
# fallback for hosts whose direct Node TLS connection times out. No credentials.
$ErrorActionPreference='Stop'
node -e "require('fs').writeFileSync('work/spa-stations.json',JSON.stringify(require('./scripts/fetch-real-topography.cjs').stations('spa',40)))"
$data=Get-Content -LiteralPath work/spa-stations.json -Raw | ConvertFrom-Json
$data.rows | ForEach-Object -Parallel {
 $p=$_
 $url='https://geoservices.wallonie.be/arcgis/rest/services/RELIEF/WALLONIE_MNT_2021_2022/MapServer/identify'
 $query='?f=json&geometry='+$p.longitude+','+$p.latitude+'&geometryType=esriGeometryPoint&sr=4326&layers=all:0&tolerance=0&mapExtent='+($p.longitude-.0001)+','+($p.latitude-.0001)+','+($p.longitude+.0001)+','+($p.latitude+.0001)+'&imageDisplay=100,100,96&returnGeometry=false'
 $response=Invoke-RestMethod -Uri ($url+$query) -TimeoutSec 45
 $v=$response.results[0].attributes.'Stretch.Pixel Value'
 if($null -eq $v){throw "Missing Spa elevation at $($p.distance)"}
 [PSCustomObject]@{distance=$p.distance;longitude=$p.longitude;latitude=$p.latitude;elevation=[double]$v;request=($url+$query);response=$response}
} -ThrottleLimit 4 | Sort-Object distance | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath work/spa-results.json -Encoding utf8
node -e "const fs=require('fs'),d=JSON.parse(fs.readFileSync('work/spa-stations.json')),r=JSON.parse(fs.readFileSync('work/spa-results.json','utf8').replace(/^\uFEFF/,''));if(r.length!==d.rows.length)throw Error('Incomplete Spa');d.rows=r.map(({response,request,...p})=>p);d.responses=r.map(({request,response})=>({request,response}));d.retrievedAt=new Date().toISOString();d.endpoint='https://geoservices.wallonie.be/arcgis/rest/services/RELIEF/WALLONIE_MNT_2021_2022/MapServer/identify';fs.writeFileSync('assets/topography/sources/spa-raw.json',JSON.stringify(d,null,2)+'\n');console.log('Spa samples',d.rows.length)"
