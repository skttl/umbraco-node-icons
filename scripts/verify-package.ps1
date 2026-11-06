param(
    [Parameter(Mandatory, Position=0)][string]$Package,
    [Parameter(Mandatory, Position=1)][string]$ExpectedVersion
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path $Package))
try {
    $names = @($zip.Entries.FullName)
    function Read-Entry([string]$Name) {
        $entry = $zip.GetEntry($Name)
        if (!$entry) { throw "Missing package entry: $Name" }
        $reader = [IO.StreamReader]::new($entry.Open())
        try { $reader.ReadToEnd() } finally { $reader.Dispose() }
    }
    $nuspecName = @($names | Where-Object { $_ -match '^[^/]+\.nuspec$' })
    if ($nuspecName.Count -ne 1) { throw 'Expected exactly one nuspec' }
    [xml]$spec = Read-Entry $nuspecName[0]
    $metadata = $spec.package.metadata
    if ($metadata.id -cne 'Umbraco.Community.NodeIcons') { throw 'Incorrect package ID' }
    if ($metadata.version -cne $ExpectedVersion) { throw 'Incorrect package version' }
    if ($ExpectedVersion -notmatch '^(17|18)\.') { throw 'Unsupported package major' }
    $major = [int]$Matches[1]
    $groups = @($metadata.dependencies.group)
    if ($groups.Count -ne 1 -or $groups[0].targetFramework -ne 'net10.0') { throw 'Expected only net10.0 dependencies' }
    $dependencies = @($groups[0].dependency)
    if ($dependencies.Count -ne 1 -or $dependencies[0].id -ne 'Umbraco.Cms.Api.Management' -or $dependencies[0].version -ne "[$major.0.0, $($major+1).0.0)") { throw 'Incorrect Umbraco dependency interval' }
    foreach ($required in @('lib/net10.0/Umbraco.Community.NodeIcons.dll','README.md','icon.png','appsettings-schema.Umbraco.Community.NodeIcons.json','buildTransitive/Umbraco.Community.NodeIcons.targets','staticwebassets/umbraco-package.json','staticwebassets/node-icons.js')) {
        if ($required -notin $names) { throw "Missing package entry: $required" }
    }
    if ($metadata.readme -ne 'README.md' -or $metadata.icon -ne 'icon.png' -or $metadata.license.'#text' -ne 'MIT') { throw 'Incorrect README, icon or license metadata' }
    $forbidden = @($names | Where-Object { $_ -match '(?i)(^|/)(demo|Client|node_modules|\.git|\.install-test)(/|$)|\.(ts|tsx|db|sqlite|pfx|key)$|(^|/)(appsettings(\.[^/]+)?\.json|secrets\.json|package-lock\.json)$' })
    if ($forbidden.Count) { throw "Unwanted package content: $($forbidden -join ', ')" }
    $schema = Read-Entry 'appsettings-schema.Umbraco.Community.NodeIcons.json' | ConvertFrom-Json
    $settings = $schema.properties.Umbraco.properties.Community.properties.NodeIcons
    if ($settings.properties.PropertyAlias.default -ne 'umbracoNodeIcon' -or $settings.properties.PropertyAlias.minLength -ne 1 -or $settings.properties.ShowOriginalIconAsSign.default -ne $true -or $settings.additionalProperties -ne $false) { throw 'Incorrect schema path, defaults or validation' }
    if ((Read-Entry 'buildTransitive/Umbraco.Community.NodeIcons.targets') -notmatch 'UmbracoJsonSchemaFiles Include="\$\(MSBuildThisFileDirectory\)\.\./appsettings-schema.Umbraco.Community.NodeIcons.json"') { throw 'Schema registration target missing' }
    $manifest = Read-Entry 'staticwebassets/umbraco-package.json' | ConvertFrom-Json
    if (($manifest.extensions | Where-Object { $_.js -eq '/App_Plugins/NodeIcons/node-icons.js' }).Count -ne 1) { throw 'Incorrect manifest entrypoint' }
    $entrypoint = Read-Entry 'staticwebassets/node-icons.js'
    $chunks = [regex]::Matches($entrypoint, '\./([^"'']+\.js)')
    if ($chunks.Count -lt 1) { throw 'Expected entity-sign dynamic chunk' }
    foreach ($chunk in $chunks) { if ("staticwebassets/$($chunk.Groups[1].Value)" -notin $names) { throw "Missing dynamic chunk $chunk" } }
    Write-Host "Verified $($metadata.id) $ExpectedVersion ($($names.Count) entries)"
} finally { $zip.Dispose() }
