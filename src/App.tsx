import { useEffect, useId, useRef, useState } from "react"

import DeleteIcon from "@mui/icons-material/Delete"
import FileOpenIcon from "@mui/icons-material/FileOpen"
import FunctionsIcon from "@mui/icons-material/Functions"
import Button from "@mui/material/Button"
import Container from "@mui/material/Container"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import Divider from "@mui/material/Divider"
import FormControl from "@mui/material/FormControl"
import Grid from "@mui/material/Grid2"
import IconButton from "@mui/material/IconButton"
import InputLabel from "@mui/material/InputLabel"
import Link from "@mui/material/Link"
import MenuItem from "@mui/material/MenuItem"
import Paper from "@mui/material/Paper"
import Select from "@mui/material/Select"
import Stack from "@mui/material/Stack"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"

import { sortBy } from "lodash-es"
import { useSnackbar } from "notistack"
import { useRegisterSW } from "virtual:pwa-register/react"

import {
  decodeBinInstructions,
  decodeElfInstructions,
  getInstructionCategories,
} from "../wasm/pkg"
import ExternalError from "./ExternalError"

const UpdateDialog = (props: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) => {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <Dialog
      open={props.open}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <DialogTitle id={titleId}>Apply updates?</DialogTitle>
      <DialogContent>
        <DialogContentText id={descriptionId}>
          A new version of this app is available. Refresh to update?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onCancel}>Cancel</Button>
        <Button onClick={props.onConfirm} autoFocus>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const TablePaper = (props: any) => (
  <Paper variant="elevation" elevation={2} {...props} />
)

const App = () => {
  type InstrStatsDict = { [key: string]: { category: string; count: number } }
  type InstrStatsArray = [string, { category: string; count: number }][]

  const { enqueueSnackbar } = useSnackbar()

  const fileTypeInputLabelId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileType, setFileType] = useState("elf")
  const [instrStats, setInstrStats] = useState<InstrStatsArray>([])
  const [categories, setCategories] = useState<{ [key: number]: string }>({})
  const [attempted, setAttempted] = useState(false)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(e) {
      enqueueSnackbar(
        `Service worker registration failed: ${e}. Offline cache will not work.`,
        {
          variant: "warning",
        }
      )
    },
  })

  useEffect(() => {
    if (offlineReady) {
      enqueueSnackbar("App is ready for offline use.", {
        variant: "info",
      })
      setOfflineReady(false)
    }
  }, [offlineReady])

  useEffect(() => {
    const func = async () => {
      setCategories(await getInstructionCategories())
    }
    func().catch((err) => {
      console.error(err)
      alert(err instanceof Error ? err.message : err)
    })
  }, [])

  return (
    <>
      <Container
        maxWidth="md"
        sx={{
          padding: "1rem",
        }}
      >
        <Stack direction="column" spacing={4}>
          <Typography variant="h4" component="h1" textAlign="center">
            la32r-instr-stats
          </Typography>
          <Divider />
          <Stack direction="column" spacing={2} component="section">
            <Typography variant="body1" component="p">
              This web app collects and displays statistics about instructions
              found in the provided LoongArch32 Reduced ELF executable or raw
              opcode binary.
            </Typography>
            <Grid
              container
              columnSpacing={2}
              rowSpacing={1}
              columns={{ xs: 4, md: 8 }}
              alignItems="center"
              justifyContent="space-between"
            >
              <Grid
                display="flex"
                justifyContent="center"
                alignItems="center"
                size={1}
              >
                <Tooltip title="Open">
                  <IconButton
                    size="large"
                    onClick={() => inputRef.current?.click()}
                  >
                    <FileOpenIcon />
                    <input
                      type="file"
                      accept={
                        fileType === "elf" ?
                          ".elf,application/x-elf,application/octet-stream"
                        : "application/octet-stream"
                      }
                      ref={inputRef}
                      onChange={(ev) => {
                        setFileName(ev.target.files?.[0]?.name ?? "")
                      }}
                      style={{
                        display: "none",
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </Grid>
              <Grid
                display="flex"
                justifyContent="center"
                alignItems="center"
                size={3}
              >
                <TextField
                  fullWidth
                  label="File name"
                  value={fileName}
                  error={attempted && !fileName}
                  slotProps={{
                    input: {
                      readOnly: true,
                    },
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                  variant="filled"
                />
              </Grid>
              <Grid
                display="flex"
                justifyContent="center"
                alignItems="center"
                size={2}
              >
                <FormControl fullWidth variant="filled">
                  <InputLabel id={fileTypeInputLabelId}>File type</InputLabel>
                  <Select
                    labelId={fileTypeInputLabelId}
                    value={fileType}
                    label="Type"
                    onChange={(ev) => {
                      setFileType(ev.target.value)
                    }}
                  >
                    <MenuItem value={"elf"}>ELF</MenuItem>
                    <MenuItem value={"bin"}>Binary</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid
                display="flex"
                justifyContent="center"
                alignItems="center"
                size={1}
              >
                <Tooltip title="Calculate">
                  <IconButton
                    size="large"
                    color="primary"
                    onClick={async () => {
                      try {
                        setAttempted(true)
                        const file = new Uint8Array(
                          (await inputRef.current?.files
                            ?.item(0)
                            ?.arrayBuffer()) ?? new ArrayBuffer()
                        )

                        if (!file) {
                          throw new Error("No file selected.")
                        }
                        let instructions
                        switch (fileType) {
                          case "bin":
                            instructions = await decodeBinInstructions(file)
                            break
                          case "elf":
                            instructions = await decodeElfInstructions(file)
                            break
                          default:
                            throw new Error(`Invalid file type: ${fileType}`)
                        }
                        const stats: InstrStatsDict = {}
                        for (const instr of instructions) {
                          if (instr.mnemonic in stats) {
                            stats[instr.mnemonic].count++
                          } else {
                            stats[instr.mnemonic] = {
                              category: categories[instr.category],
                              count: 1,
                            }
                          }
                        }
                        setInstrStats(
                          sortBy(Object.entries(stats), (obj) => -obj[1].count)
                        )
                      } catch (err) {
                        console.error(err)
                        err =
                          err instanceof Error ? err : (
                            new ExternalError(`${err}`, err)
                          )
                        enqueueSnackbar({
                          message: `${err}`,
                          variant: "error",
                        })
                      }
                    }}
                  >
                    <FunctionsIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
              <Grid
                display="flex"
                justifyContent="center"
                alignItems="center"
                size={1}
              >
                <Tooltip title="Clear">
                  <IconButton
                    size="large"
                    onClick={() => {
                      setAttempted(false)
                      setFileName("")
                      setInstrStats([])
                      if (inputRef.current) {
                        inputRef.current.value = ""
                      }
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
            <TableContainer component={TablePaper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Mnemonic</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Category</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Count</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {instrStats.length === 0 ?
                    <TableRow key="none" sx={{ border: 0 }}>
                      <TableCell colSpan={3} align="center">
                        (none)
                      </TableCell>
                    </TableRow>
                  : instrStats.map(([mnemonic, data]) => (
                      <TableRow
                        key={mnemonic}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell component="th" scope="row">
                          <code>{mnemonic}</code>
                        </TableCell>
                        <TableCell>{data.category}</TableCell>
                        <TableCell>{data.count}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
          <Divider />
          <Stack direction="column" spacing={2} component="section">
            <Typography variant="h5" component="h2">
              How does it work?
            </Typography>
            <Typography variant="body1" component="p">
              All statistics are computed locally in the browser, and no data is
              sent to any server. The decoding is done through a Rust WASM
              module, so that we can avoid writing complex bit operations in
              JavaScript.
            </Typography>
            <Typography variant="body1" component="p">
              For ELF files, we iterate over each <code>.text*</code> section
              and use a linear sweep to decode the instructions. For raw
              binaries, we just use a linear sweep.
            </Typography>
            <Typography variant="body1" component="p">
              The source code for this app is available at{" "}
              <Link
                href="https://github.com/CSharperMantle/la32r-instr-stats"
                target="_blank"
                rel="noopener"
              >
                https://github.com/CSharperMantle/la32r-instr-stats
              </Link>
              .
            </Typography>
          </Stack>
          <Stack direction="column" spacing={2} component="section">
            <Typography variant="h5" component="h2">
              License
            </Typography>
            <Typography variant="body1" component="p">
              Copyright &copy; 2025 Rong "Mantle" Bao {"<"}
              <Link href="mailto:webmaster@csmantle.top">
                webmaster@csmantle.top
              </Link>
              {">"}.
            </Typography>
            <Typography variant="body1" component="p">
              This program is free software: you can redistribute it and/or
              modify it under the terms of the GNU Affero General Public License
              as published by the Free Software Foundation, either version 3 of
              the License, or (at your option) any later version.
            </Typography>
            <Typography variant="body1" component="p">
              This program is distributed in the hope that it will be useful,
              but <strong>WITHOUT ANY WARRANTY</strong>; without even the
              implied warranty of
              <strong>MERCHANTABILITY</strong> or{" "}
              <strong>FITNESS FOR A PARTICULAR PURPOSE</strong>. See the GNU
              Affero General Public License for more details.
            </Typography>
            <Typography variant="body1" component="p">
              You should have received a copy of the GNU Affero General Public
              License along with this program. If not, see{" "}
              <Link
                href="https://www.gnu.org/licenses/"
                target="_blank"
                rel="noopener"
              >
                https://www.gnu.org/licenses/
              </Link>
              .
            </Typography>
          </Stack>
        </Stack>
      </Container>
      <UpdateDialog
        open={needRefresh}
        onConfirm={async () => {
          await updateServiceWorker(true)
          setNeedRefresh(false)
        }}
        onCancel={() => {
          setNeedRefresh(false)
        }}
      />
    </>
  )
}

export default App
