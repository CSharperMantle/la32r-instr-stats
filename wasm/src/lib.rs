#![deny(clippy::all)]

mod decode;
use decode::decode_instruction;
use decode::InstructionCategory;

use elf::abi::ET_EXEC;
use elf::endian::AnyEndian;
use elf::file::Class;
use elf::ElfBytes;
use strum::IntoEnumIterator;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

#[wasm_bindgen(getter_with_clone)]
pub struct WasmDecodedInstruction {
  pub mnemonic: String,
  pub category: u8,
}

fn decode_raw(data: &[u8]) -> Box<[WasmDecodedInstruction]> {
  data
    .chunks_exact(4)
    .filter_map(|chunk| {
      let mut buf = [0u8; 4];
      buf.copy_from_slice(chunk);
      decode_instruction(u32::from_le_bytes(buf)).ok()
    })
    .map(|instr| WasmDecodedInstruction {
      mnemonic: instr.mnemonic.to_string(),
      category: instr.category as u8,
    })
    .collect::<Vec<WasmDecodedInstruction>>()
    .into_boxed_slice()
}

#[wasm_bindgen(js_name = decodeElfInstructions)]
pub async fn decode_elf_instructions(
  elf_data: &[u8],
) -> Result<Box<[WasmDecodedInstruction]>, JsValue> {
  let elf_obj = ElfBytes::<AnyEndian>::minimal_parse(elf_data)
    .map_err(|_| JsValue::from_str("Not a valid ELF file."))?;
  if elf_obj.ehdr.class != Class::ELF32
    || elf_obj.ehdr.e_type != ET_EXEC
    || elf_obj.ehdr.e_machine != 258
  {
    return Err(JsValue::from_str("Not an LA32 ELF file."));
  }

  let (hdrs, strtab) = elf_obj
    .section_headers_with_strtab()
    .map_err(|_| JsValue::from_str("Can not find section headers with strtab"))?;

  let hdrs = hdrs.ok_or(JsValue::from_str("Can not find section headers."))?;
  let strtab = strtab.ok_or(JsValue::from_str("Can not find strtab."))?;

  let result = hdrs
    .iter()
    .filter_map(|hdr| {
      if strtab.get(hdr.sh_name as usize).ok()?.starts_with(".text") {
        let (bytes, compression) = elf_obj.section_data(&hdr).ok()?;
        match compression {
          None => Some(decode_raw(bytes)),
          Some(_) => None,
        }
      } else {
        None
      }
    })
    .flatten()
    .collect::<Vec<WasmDecodedInstruction>>()
    .into_boxed_slice();

  Ok(result)
}

#[wasm_bindgen(js_name = decodeBinInstructions)]
pub async fn decode_bin_instructions(
  bin_data: &[u8],
) -> Result<Box<[WasmDecodedInstruction]>, JsValue> {
  Ok(decode_raw(bin_data))
}

#[wasm_bindgen(js_name = getInstructionCategories)]
pub async fn get_instruction_categories() -> Box<[String]> {
  InstructionCategory::iter()
    .map(|cat| {
      let s: &'static str = cat.into();
      s.to_string()
    })
    .collect::<Vec<String>>()
    .into_boxed_slice()
}
