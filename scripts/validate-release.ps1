param(
    [Parameter(Mandatory)][string] $Tag,
    [string] $ProjectPath = (Join-Path $PSScriptRoot '../src/Umbraco.Community.NodeIcons/Umbraco.Community.NodeIcons.csproj'),
    [string] $RepositoryRoot = (Join-Path $PSScriptRoot '..'),
    [string] $Commit = 'HEAD',
    [string] $Remote = 'origin'
)
$ErrorActionPreference = 'Stop'
$identifier = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)'
if ($Tag -cnotmatch "^v(?<major>0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-$identifier(?:\.$identifier)*)?\z") {
    throw "Invalid stable/prerelease tag: $Tag"
}
$major = [int]$Matches.major
[xml]$project = Get-Content -LiteralPath $ProjectPath -Raw
$packageVersion = [string]$project.Project.PropertyGroup.Version
if ($packageVersion -notmatch '^([0-9]+)\.' -or [int]$Matches[1] -ne $major) {
    throw 'Tag major must match the project package version major.'
}
$dependency = @($project.Project.ItemGroup.PackageReference | Where-Object Include -eq 'Umbraco.Cms.Api.Management')
$expectedInterval = "[$major.0.0,$($major + 1).0.0)"
if ($dependency.Count -ne 1 -or $dependency[0].Version -cne $expectedInterval) {
    throw "Expected Umbraco dependency interval $expectedInterval."
}
$branch = switch ($major) {
    18 { 'main' }
    17 { 'v17/main' }
    default { throw "Unsupported release major: $major" }
}
# The workflow fetches complete history and the remote branch before this check.
& git -C $RepositoryRoot merge-base --is-ancestor $Commit "refs/remotes/$Remote/$branch"
if ($LASTEXITCODE -ne 0) { throw "Tagged commit must belong to $Remote/$branch history." }
[pscustomobject]@{ Version = $Tag.Substring(1); Branch = $branch }

