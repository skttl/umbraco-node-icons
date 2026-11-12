$ErrorActionPreference = 'Stop'
$root = Join-Path ([IO.Path]::GetTempPath()) ('nodeicons-release-' + [guid]::NewGuid())
New-Item -ItemType Directory $root | Out-Null
$validator = Join-Path $PSScriptRoot 'validate-release.ps1'
function InvokeFixtureGit([string[]] $Arguments) {
    & git -C $root @Arguments | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Fixture git failed: $Arguments" }
}
function Check([string] $Tag, [bool] $Accept, [int] $Major = 18, [string] $Interval = '', [string] $Commit = 'HEAD') {
    if (!$Interval) { $Interval = "[$Major.0.0,$($Major + 1).0.0)" }
    $project = Join-Path $root 'fixture.csproj'
    "<Project><PropertyGroup><Version>$Major.0.0</Version></PropertyGroup><ItemGroup><PackageReference Include=`"Umbraco.Cms.Api.Management`" Version=`"$Interval`" /></ItemGroup></Project>" | Set-Content $project
    $accepted = $false
    try {
        $result = & $validator -Tag $Tag -ProjectPath $project -RepositoryRoot $root -Commit $Commit
        $accepted = $true
        if ($result.Version -cne $Tag.Substring(1)) { throw 'Version changed.' }
    } catch {
        if ($Accept) { throw }
    }
    if ($accepted -ne $Accept) { throw "Unexpected acceptance for $Tag / $Major / $Interval / $Commit" }
}
try {
    InvokeFixtureGit @('init', '--quiet')
    InvokeFixtureGit @('-c', 'user.name=Release test', '-c', 'user.email=test@example.invalid', 'commit', '--allow-empty', '-m', 'base', '--quiet')
    InvokeFixtureGit @('update-ref', 'refs/remotes/origin/v18/main', 'HEAD')
    InvokeFixtureGit @('update-ref', 'refs/remotes/origin/v17/main', 'HEAD')
    foreach ($tag in @('v18.0.0', 'v18.1.2-rc1', 'v18.0.0-beta.2', 'v18.0.0-0', 'v18.0.0-01a')) { Check $tag $true }
    Check 'v17.0.0-rc.1' $true 17
    foreach ($tag in @('18.0.0', 'vv18.0.0', 'v018.0.0', 'v18.01.0', 'v18.0', 'v18.0.0-', 'v18.0.0-01', 'v18.0.0-beta.02', 'v18.0.0-a..b', 'v18.0.0-a_b', 'v18.0.0+build', "v18.0.0`n")) { Check $tag $false }
    Check 'v17.0.0' $false
    Check 'v18.0.0' $false 18 '[18.0.0,19.0.0]'
    Check 'v18.0.0' $false 18 '[17.0.0,18.0.0)'
    InvokeFixtureGit @('-c', 'user.name=Release test', '-c', 'user.email=test@example.invalid', 'commit', '--allow-empty', '-m', 'not on remote branch', '--quiet')
    Check 'v18.0.0' $false
    Check 'v17.0.0' $false 17
    Check 'v18.0.0' $true 18 '' 'HEAD~1'
    InvokeFixtureGit @('update-ref', 'refs/remotes/origin/v18/main', 'HEAD')
    Check 'v18.0.0' $true
    Check 'v17.0.0' $false 17
    InvokeFixtureGit @('update-ref', 'refs/remotes/origin/v18/main', 'HEAD~1')
    InvokeFixtureGit @('update-ref', 'refs/remotes/origin/v17/main', 'HEAD')
    Check 'v17.0.0' $true 17
    Check 'v18.0.0' $false
    Write-Host 'Release validation self-check passed (valid tags, invalid identifiers, majors, intervals and ancestry).'
} finally {
    Remove-Item -LiteralPath $root -Recurse -Force
}
# Expected git rejections must not become the CLI exit code after all assertions pass.
exit 0
